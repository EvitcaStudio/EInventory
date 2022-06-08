(() => {
	const engineWaitId = setInterval(() => {
		if (VS.Client && VS.global.aInterfaceUtils) {
			clearInterval(engineWaitId);
			buildClientInventory();
		}
	});

	const buildClientInventory = () => {
		const aInventory = {};
		VS.Client.___EVITCA_aInventory = true;
		VS.Client.aInventory = aInventory;
		VS.global.aInventory = aInventory;
		
		const GUI_TAG = '_gui';
		const SLOT_TYPE = 'Interface/aInventory/Slot';
		const SLOT_OVERLAY_TYPE = 'SlotGUI';
		const MAX_SLOTS = (VS.global.MAX_SLOTS ? VS.global.MAX_SLOTS : 20);

		// a variable that tracks if the inventory is *busy* and cannot do any other request until it is finished
		aInventory.busy = false;

		// Preset this type to have these variables.
		VS.Type.setType('GroundItem', {
			description: '',
			displayName: '',
			// what category this item belongs to
			category: '',
			// if this item can represent more than one of itself
			stackable: false,
			// the current amount of this item represented by this item
			quantity: 1,
			// the max amount of this item that can be represented
			maxQuantity: 1,
			// if this item is equippable
			equippable: false,
			// if this item was created by a player or something
			craftsman: '',
			// if this item is able to be collected
			obtainable: false,
			// if this item requires a prompt to be dropped, use this if the item is special and you don't want the item to be accidentatlly dropped.
			requiresPrompt: false,
			mouseOpacity: 1,
			plane: 1,
			layer: 1,
			onNew: function (pX, pY, pMap, pQuantity) {
				this.setup(pX, pY, pMap, pQuantity);
			},
			onDumped: function(pX, pY, pMap, pQuantity) {
				this.setup(pX, pY, pMap, pQuantity);
			},
			setup: function(pX, pY, pMap, pQuantity) {
				if ((pX || pX === 0) && (pY || pY === 0) && pMap) {
					if (pQuantity) {
						this.quantity = pQuantity;
					}
					this.setPos(pX, pY, pMap);
					this.obtainable = true;
				}
			},
			clean: function() {
				this.quantity = 1;
				this.obtainable = false;
			}
	}, ['Diob']);

		VS.Type.newType('SlotGUI', {
			width: 50,
			height: 50,
			mouseOpacity: 0,
			touchOpacity: 0,
			preventAutoScale: true,
		}, ['Overlay']);

		VS.Type.newType('Interface/aInventory/Background', {
		});

		VS.Type.setType('Interface/aInventory/Slot', {
			interfaceType: 'WebBox',
			parentElement: 'inventory_background',
			info: {
				// if a item in currently in this slot or not
				occupied: false,
				// the item that this slot is currently holding
				item: {},
				// if the item is equpped
				equipped: false
			},
			onMouseMove: function(pClient, pX, pY) {
				if (!VS.global.aInventory.grabbing && !VS.global.aInventory.isHoldingSlot) {
					if (VS.global.aInventory.infoMenu) {
						if (!VS.global.aInventory.infoMenu.isHidden) {
							VS.global.aInventory.c_positionInfoMenu();
						}
					}
				}
			},
			onMouseEnter: function(pClient, pX, pY) {
				if (!VS.Client.dragging) {
					this.iconState = 'highlighted';
					if (!VS.global.aInventory.grabbing && !VS.global.aInventory.isHoldingSlot) {
						if (this.info.occupied) {
							VS.Client.setMouseCursor('pointer');
							VS.global.aInventory.c_showInfoMenu(this);
						}
					}
				}
			},
			onMouseExit: function(pClient, pX, pY) {
				this.iconState = '';
				if (!VS.global.aInventory.grabbing && !VS.global.aInventory.isHoldingSlot) {
					VS.Client.setMouseCursor('');
					VS.global.aInventory.c_hideInfoMenu();
				}
			}
		});
		
		VS.Type.newType('Interface/aInventory/InfoMenu', {
			interfaceType: 'WebBox',
			mouseOpacity: 0,
			touchOpacity: 0,
			plane: 2,
			layer: 2
		});

		VS.global.aListener.addEventListener(VS.Client, 'onMouseDown', function(pDiob, pX, pY, pButton) {
			if (pButton === 1) {
				if (!aInventory.busy) {
					if (pDiob && pDiob.type === SLOT_TYPE) {
						const slotElement = pDiob;
						if (slotElement.info.occupied) {
							const slotElementInfo = {};
							VS.Util.copyObject(slotElementInfo, slotElement.info);
							aInventory.heldSlot = { slot: slotElement, info: slotElementInfo, ID: slotElementInfo.item.ID };
							aInventory.isHoldingSlot = true;
							aInventory.grabbing  = true;
							aInventory.c_hideInfoMenu();
							if (!this.aInventoryMouseCursor) {
								this.aInventoryMouseCursor = VS.newDiob();
							}
							const atlasName = VS.Type.getVariable(slotElement.info.item.type, 'atlasName');
							const iconName = VS.Type.getVariable(slotElement.info.item.type, 'iconName');
							const iconState = VS.Type.getVariable(slotElement.info.item.type, 'iconState');
							this.aInventoryMouseCursor.atlasName = atlasName;
							this.aInventoryMouseCursor.iconName = iconName;
							this.aInventoryMouseCursor.iconState = iconState;
							this.setMouseCursor(this.aInventoryMouseCursor);
							aInventory.c_cleanSlot(slotElement);
						}
					}
				}
			}
		});

		VS.global.aListener.addEventListener(VS.Client, 'onMouseUp', function(pDiob, pX, pY, pButton) {
			if (pButton === 1) {
				if (!aInventory.busy) {
					aInventory.grabbing = false;
					if (pDiob) {
						const INVENTORY_BACKGROUND_TYPE = 'Interface/aInventory/Background';
						if (aInventory.heldSlot && pDiob.mapName && pDiob.baseType !== 'Interface') {
							// if this diob is a map diob, drop it onto the map
							aInventory.c_dropItemFromSlot(aInventory.heldSlot);
						} else if (aInventory.heldSlot && pDiob.type === SLOT_TYPE) {
							const slotElement = pDiob;
							if (slotElement.info.occupied) {
								// slotElement has something in it
								aInventory.c_swapSlotItems(aInventory.heldSlot, slotElement);
							} else {
								// slotElement is empty
								aInventory.c_moveSlotItem(aInventory.heldSlot, slotElement)
							}				
						} else if (aInventory.heldSlot && pDiob.type === INVENTORY_BACKGROUND_TYPE) {
							// if you are holding onto a slot and you have moved it over the inventory background, then this is a illegal drop and the item is returned to its slot
							aInventory.c_restoreSlot(aInventory.heldSlot);
						} else if (aInventory.heldSlot && pDiob.baseType === 'Interface') {
							// if you are holding onto a slot and you have moved it over a interface diob, could be dropping it into another interface for usage?
							// call a event function with helpful paramas to figure out what to do with this item, the event function will have a callback parameter embedded into it, if when called will automatically remove this item from the inventory.
							// maybe this will be able to get a certain quantity of the item that is dropped if requested, and a dialog appears to choose and the callback is passed along?
							aInventory.c_dropItemFromSlot(aInventory.heldSlot, 'Interface');
						}
					} else if (aInventory.heldSlot) {
						// if you are holding onto a slot and there is no diob at all (it must be a tile since they have no mouseOpacity by default or a map void)
						aInventory.c_dropItemFromSlot(aInventory.heldSlot);
					}
				}
			}
		});

		// packet to add to clientside
		// item is added to the inventory and can be interacted with
		aInventory.c_addItemToSlot = function(pItemID, pSlot, pID, pRequiresPrompt=false, pCategory='', pStackable=false, pQuantity=1, pEquippable=false, pCraftsman='') {
			if (!VS.Client.mob.c_inventory) {
				VS.Client.mob.c_inventory = {};
			}
			const item = VS.World.getDiobByID(pItemID);
			const slotElement = VS.Client.getInterfaceElement('aInventory_interface', 'slot'+pSlot);
			let newItem = false;
			let slotGUI;
			if (slotElement) {
				if (item.type) {
					if (!VS.Client.mob.c_inventory[pID]) {
						VS.Client.mob.c_inventory[pID] = {
							'slot': pSlot,
							'category': pCategory,
							'stackable': pStackable,
							'quantity': pQuantity,
							'equippable': pEquippable,
							'craftsman': pCraftsman,
							'requiresPrompt': pRequiresPrompt,
							'ID': pID,
							'type': item.type
						}
						newItem = true;
						if (!slotElement.overlays.length) {
							slotGUI = slotElement.addOverlay(SLOT_OVERLAY_TYPE, { 'ownState': true }, true);
						} else {
							slotGUI = slotElement.overlays[0];
						}
						slotGUI.atlasName = item.atlasName;
						if (item.iconState) {
							slotGUI.iconName = item.iconState + GUI_TAG;
						} else {
							slotGUI.iconName = item.iconName + GUI_TAG;
						}
						slotElement.info.occupied = true;
						VS.Util.copyObject(slotElement.info.item, VS.Client.mob.c_inventory[pID]);
						slotElement.text = '<div class="aInventory_text aInventory_stackNumber">' + '<sub>' + (pStackable ? VS.Client.mob.c_inventory[pID].quantity : '') +'</sub></div>'
					}
					if (!newItem) {
						if (pStackable) {
							if (pQuantity) {
								VS.Client.mob.c_inventory[pID].quantity = pQuantity;
								slotElement.info.item.quantity = pQuantity;
								slotElement.text = '<div class="aInventory_text aInventory_stackNumber">' + '<sub>' + (pStackable ? VS.Client.mob.c_inventory[pID].quantity : '') + '</sub></div>';
							}
						}
					}
				}
			}
		}

		aInventory.c_removeItemFromSlot = function(pSlotID, pQuantity) {
			// packet to remove the item from clientside
			const slotElement = VS.Client.getInterfaceElement('aInventory_interface', 'slot' + VS.Client.mob.c_inventory[pSlotID].slot);
			if (VS.Client.mob.c_inventory[pSlotID].quantity === pQuantity) {
				// reset the slot's data
				this.c_cleanSlot(slotElement);
				delete VS.Client.mob.c_inventory[pSlotID];
			} else {
				VS.Client.mob.c_inventory[pSlotID].quantity -= pQuantity;
				VS.Util.copyObject(slotElement.info.item, VS.Client.mob.c_inventory[pSlotID]);
				slotElement.text = '<div class="aInventory_text aInventory_stackNumber">' + '<sub>' + (VS.Client.mob.c_inventory[pSlotID].stackable ? VS.Client.mob.c_inventory[pSlotID].quantity : '') + '</sub></div>';
			}			
		}
		
		// if an illegal drop of a slot is made the item is put back into its original slot and all tracking variables are reset
		// or if a drop isn't completed this is called
		aInventory.c_restoreSlot = function(pSlotData) {
			if (!this.busy) {
				const slot = pSlotData.slot;
				const slotGUI = slot.overlays[0];
				VS.Util.copyObject(slot.info, pSlotData.info);
				slotGUI.atlasName = VS.Type.getVariable(VS.Client.mob.c_inventory[pSlotData.ID].type, 'atlasName');
				slotGUI.iconName = (VS.Type.getVariable(VS.Client.mob.c_inventory[pSlotData.ID].type, 'iconState') ? VS.Type.getVariable(VS.Client.mob.c_inventory[pSlotData.ID].type, 'iconState') : VS.Type.getVariable(VS.Client.mob.c_inventory[pSlotData.ID].type, 'iconName')) + GUI_TAG;
				slot.text = '<div class="aInventory_text aInventory_stackNumber">' + '<sub>' + (VS.Client.mob.c_inventory[pSlotData.ID].stackable ? VS.Client.mob.c_inventory[pSlotData.ID].quantity : '') + '</sub></div>';
				VS.Client.setMouseCursor('');
				this.heldSlot = null;
				this.isHoldingSlot = false;
			}
		}

		aInventory.c_drop = function(pSlotID, pQuantity=1) {
			let item;
			const x = VS.Client.mob.xPos;
			const y = VS.Client.mob.yPos;
			const map = VS.Client.mob.mapName;
			if (VS.global.aRecycle) {
				item = VS.global.aRecycle.isInCollection(VS.Client.mob.c_inventory[pSlotID].type, 1, VS.global.aRecycle.basicCollection, false, x, y, map, pQuantity);
			} else {
				item = VS.newDiob(pType, x, y, map, pQuantity);
			}
			if (item.onDropped && typeof(item.onDropped) === 'function') {
				item.onDropped();
			}
		}

		aInventory.c_dropItemFromSlot = function(pSlotData, pMethod) {
			// on drop event for the item
			// item can be dropped on the map or another interface
			if (!this.busy) {
				let quantity = 1;
				VS.Client.setMouseCursor('');
				this.heldSlot = null;
				this.isHoldingSlot = false;
				if (pMethod === 'Interface') {
					this.c_restoreSlot(pSlotData);
					return;
				}

				// if the item requires a prompt it must be a special item, first have the player confirm they want to drop it
				if (VS.Client.mob.c_inventory[pSlotData.ID].requiresPrompt) {
					const confirmDropItem = function(pBool, pSlotData, pQuantity) {
						if (pBool) {
							this.busy = false;
							// if you remove this amount of items from the stack and there is still some left, then restore this item to the inventory
							if ((VS.Client.mob.c_inventory[pSlotData.ID].quantity - pQuantity) > 0) {
								this.c_restoreSlot(pSlotData);
							}
							// separate code to be ran if this isn't a multiplayer game
							if (VS.World.getPlayerMode() === 1) {
								this.c_drop(pSlotData.ID, pQuantity);
							} else {
								// send packet to drop item. The server will remove the item from the inventory if the drop is legal and send a packet back to the client to do the same
								if (VS.Client.onNetwork && typeof(VS.Client.onNetwork) === 'function') {
									VS.Client.onNetwork('aInventory', 'c_dropItemFromSlot', [pSlotData.ID, pQuantity]);
								}
							}
						} else {
							this.busy = false;
							this.c_restoreSlot(pSlotData);
						}
					}
					// if the item you are dropping is stackable, and there is more than one of them, then you need to decide how many to drop.
					if (VS.Client.mob.c_inventory[pSlotData.ID].stackable && VS.Client.mob.c_inventory[pSlotData.ID].quantity > 1) {
						const inputQuantity = function(pValue, pSlotData) {
							const value = parseInt(pValue);
							quantity = VS.Math.clamp(Number.isInteger(value) ? value : 1, 0, VS.Client.mob.c_inventory[pSlotData.ID].quantity);
							if (quantity >= 1) {
								VS.global.aInterfaceUtils.confirm('Drop <span style="text-decoration: underline; font-weight: bold;"> ' + quantity + ' </span> ' + VS.Type.getVariable(VS.Client.mob.c_inventory[pSlotData.ID].type, 'displayName') + '?', 'Are you sure?', confirmDropItem.bind(this), [pSlotData, quantity]);
							} else {
								this.busy = false;
								this.c_restoreSlot(pSlotData);								
							}
						}
						VS.global.aInterfaceUtils.input('How many would you like to drop?', 1, true, inputQuantity.bind(this), [pSlotData]);
						this.busy = true;
					} else {
						VS.global.aInterfaceUtils.confirm('Drop ' + VS.Type.getVariable(VS.Client.mob.c_inventory[pSlotData.ID].type, 'displayName') + '?', 'Are you sure?', confirmDropItem.bind(this), [pSlotData, VS.Client.mob.c_inventory[pSlotData.ID].quantity]);
						this.busy = true;
					}
				} else {
					// if the item you are dropping is stackable, and there is more than one of them, then you need to decide how many to drop.
					if (VS.Client.mob.c_inventory[pSlotData.ID].stackable && VS.Client.mob.c_inventory[pSlotData.ID].quantity > 1) {
						const inputQuantity = function(pValue, pSlotData) {
							const value = parseInt(pValue);
							quantity = VS.Math.clamp(Number.isInteger(value) ? value : 1, 0, VS.Client.mob.c_inventory[pSlotData.ID].quantity);
							if (quantity >= 1) {
								this.busy = false;
								// if you remove this amount of items from the stack and there is still left, then restore this item to the inventory
								if ((VS.Client.mob.c_inventory[pSlotData.ID].quantity - quantity) > 0) {
									this.c_restoreSlot(pSlotData);
								}
								// separate code to be ran if this isn't a multiplayer game
								if (VS.World.getPlayerMode() === 1) {
									this.c_drop(pSlotData.ID, quantity);
								} else {
									// if the item does not require a prompt, send a packet to drop the item. The server will remove the item from the inventory if the drop is legal and send a packet back to the client to do the same
									if (VS.Client.onNetwork && typeof(VS.Client.onNetwork) === 'function') {
										VS.Client.onNetwork('aInventory', 'c_dropItemFromSlot', [pSlotData.ID, quantity]);
									}
								}
							} else {
								this.busy = false;
								this.c_restoreSlot(pSlotData);
							}
						}
						VS.global.aInterfaceUtils.input('How many would you like to drop?', 1, true, inputQuantity.bind(this), [pSlotData]);
						this.busy = true;
					} else {
						// separate code to be ran if this isn't a multiplayer game
						if (VS.World.getPlayerMode() === 1) {
							this.c_drop(pSlotData.ID);
						} else {
							// if the item does not require a prompt, send a packet to drop the item. The server will remove the item from the inventory if the drop is legal and send a packet back to the client to do the same
							if (VS.Client.onNetwork && typeof(VS.Client.onNetwork) === 'function') {
								const NO_QUANTITY = 0;
								VS.Client.onNetwork('aInventory', 'c_dropItemFromSlot', [pSlotData.ID, NO_QUANTITY]);
							}
						}
					}
				}
			}
		}

		aInventory.c_getInventory = function() {
			const copyOfInventory = {};
			VS.Util.copyObject(copyOfInventory, VS.Client.mob.c_inventory);
			return copyOfInventory;
		}

		aInventory.c_wipeInventory = function() {
			for (const item in VS.Client.mob.c_inventory) {
				const slotElement = VS.Client.getInterfaceElement('aInventory_interface', 'slot' + VS.Client.mob.c_inventory[item].slot);
				this.c_cleanSlot(slotElement);
			}
			this.c_hideInfoMenu();
			VS.Client.mob.c_inventory = {};
			if (VS.World.getPlayerMode() !== 1) {
				if (VS.Client.onNetwork && typeof(VS.Client.onNetwork) === 'function') {
					VS.Client.onNetwork('aInventory', 'c_wipeInventory');
				}
			}
		}

		// clears away any binding information from this slot
		aInventory.c_cleanSlot = function(pSlot) {
			if (!this.busy) {
				pSlot.info.occupied = false;
				pSlot.info.item = {};
				pSlot.info.equipped = false;
				pSlot.text = '';
				const slotOverlay = pSlot.overlays[0];
				slotOverlay.atlasName = ''
				slotOverlay.iconName = '';
			}
		}

		// just moving slot data to and from slots
		aInventory.c_swapSlotItems = function(pSlotData, pSlot2) {
			if (!this.busy) {
				const slot1 = pSlotData.slot;
				const firstSlotNumber = parseInt(slot1.name.match(/(\d+)/).pop());
				const secondSlotNumber = parseInt(pSlot2.name.match(/(\d+)/).pop());

				VS.Util.copyObject(slot1.info, pSlot2.info);
				VS.Util.copyObject(pSlot2.info, pSlotData.info);

				VS.Client.mob.c_inventory[slot1.info.item.ID].slot = firstSlotNumber;
				VS.Client.mob.c_inventory[pSlot2.info.item.ID].slot = secondSlotNumber;
				slot1.info.item.slot = firstSlotNumber;
				pSlot2.info.item.slot = secondSlotNumber;

				const slot1GUI = slot1.overlays[0];
				const slot2GUI = pSlot2.overlays[0];

				slot1GUI.atlasName = VS.Type.getVariable(slot1.info.item.type, 'atlasName');
				slot2GUI.atlasName = VS.Type.getVariable(pSlot2.info.item.type, 'atlasName');
				slot1GUI.iconName = (VS.Type.getVariable(slot1.info.item.type, 'iconState') ? VS.Type.getVariable(slot1.info.item.type, 'iconState') : VS.Type.getVariable(slot1.info.item.type, 'iconName')) + GUI_TAG;
				slot2GUI.iconName = (VS.Type.getVariable(pSlot2.info.item.type, 'iconState') ? VS.Type.getVariable(pSlot2.info.item.type, 'iconState') : VS.Type.getVariable(pSlot2.info.item.type, 'iconName')) + GUI_TAG;

				// add overlays here based on equipped value
				// if (pSlot2.info.equipped) {

				// }

				// if (slot1.info.equipped) {

				// }

				slot1.text = '<div class="aInventory_text aInventory_stackNumber">' + '<sub>' + (VS.Client.mob.c_inventory[slot1.info.item.ID].stackable ? VS.Client.mob.c_inventory[slot1.info.item.ID].quantity : '') + '</sub></div>';
				pSlot2.text = '<div class="aInventory_text aInventory_stackNumber">' + '<sub>' + (VS.Client.mob.c_inventory[pSlot2.info.item.ID].stackable ? VS.Client.mob.c_inventory[pSlot2.info.item.ID].quantity : '') + '</sub></div>';

				this.heldSlot = null;
				this.isHoldingSlot = false;
				this.c_showInfoMenu(pSlot2);
				VS.Client.setMouseCursor('pointer');
				if (VS.World.getPlayerMode() !== 1) {
					if (VS.Client.onNetwork && typeof(VS.Client.onNetwork) === 'function') {
						VS.Client.onNetwork('aInventory', 'c_swapSlotItems', [slot1.info.item.ID, pSlot2.info.item.ID, firstSlotNumber, secondSlotNumber])
					}
				}
			}
		}

		// move a slot to a empty slot
		aInventory.c_moveSlotItem = function(pSlotData, pSlot2) {
			if (!this.busy) {
				if (pSlotData.info.item.slot === parseInt(pSlot2.name.match(/(\d+)/).pop())) {
					this.c_restoreSlot(pSlotData);
					return;
				}
				let slot2GUI;

				VS.Util.copyObject(pSlot2.info, pSlotData.info);
				VS.Client.mob.c_inventory[pSlot2.info.item.ID].slot = parseInt(pSlot2.name.match(/(\d+)/).pop());
				pSlot2.info.item.slot = VS.Client.mob.c_inventory[pSlot2.info.item.ID].slot;
				if (pSlot2.overlays.length) {
					slot2GUI = pSlot2.overlays[0];
				} else {
					slot2GUI = pSlot2.addOverlay(SLOT_OVERLAY_TYPE, { 'ownState': true }, true);
				}
				slot2GUI.atlasName = VS.Type.getVariable(pSlot2.info.item.type, 'atlasName');
				slot2GUI.iconName = (VS.Type.getVariable(pSlot2.info.item.type, 'iconState') ? VS.Type.getVariable(pSlot2.info.item.type, 'iconState') : VS.Type.getVariable(pSlot2.info.item.type, 'iconName')) + GUI_TAG;

				pSlot2.text = '<div class="aInventory_text aInventory_stackNumber">' + '<sub>' + (VS.Client.mob.c_inventory[pSlot2.info.item.ID].stackable ? VS.Client.mob.c_inventory[pSlot2.info.item.ID].quantity : '') + '</sub></div>';

				this.heldSlot = null;
				this.isHoldingSlot = false;
				this.c_showInfoMenu(pSlot2);
				VS.Client.setMouseCursor('pointer');
				if (VS.World.getPlayerMode() !== 1) {
					if (VS.Client.onNetwork && typeof(VS.Client.onNetwork) === 'function') {
						VS.Client.onNetwork('aInventory', 'c_moveSlotItem', [pSlot2.info.item.ID, pSlot2.info.item.slot]);
					}
				}
			}
		}

		// show a information menu for the item that is in this slot
		aInventory.c_showInfoMenu = function(pSlot) {
			// a reference to the information window that appears when hovering over an item
			this.infoMenu = VS.Client.getInterfaceElement('aInventory_interface', 'infomenu');
			if (this.infoMenu) {
				if (!this.busy) {
					if (this.infoMenu.isHidden) {
						this.infoMenu.show();
						this.infoMenu.text = '<div class="aInventory_text">' + VS.Type.getVariable(pSlot.info.item.type, 'displayName') + '<div class="aKeybinds_floatRight">' + pSlot.info.item.category + '</div><hr>' + VS.Type.getVariable(pSlot.info.item.type, 'description') + '</div>';
						this.c_positionInfoMenu();
					}
				}
			}
		}

		// hide the information menu
		aInventory.c_hideInfoMenu = function() {
			if (this.infoMenu) {
				if (!this.infoMenu.isHidden) {
					this.infoMenu.hide();
				}
			}
		}

		// position the menu when the mouse moves
		aInventory.c_positionInfoMenu = function() {
			if (this.infoMenu) {
				if (!this.busy) {
					const mousePos = VS.Client.getMousePos();
					let x;
					let y;
					if (this.infoMenu.preventAutoScale) {
						mousePos.x *= VS.Client._screenScale.x;
						mousePos.y *= VS.Client._screenScale.y;
					}

					x = mousePos.x;
					y = mousePos.y - VS.global.aInventory.infoMenu.height;

					if (x + VS.global.aInventory.infoMenu.width > VS.Client._windowSize.width) {
						x = mousePos.x - VS.global.aInventory.infoMenu.width;
					}

					if (y < 0) {
						y = mousePos.y;
					}

					this.infoMenu.setPos(x, y);
				}
			}
		}

		// toggle the debug mode, which allows descriptive text to be shown when things of notice happen
		aInventory.toggleDebug = function() {
			this.debugging = !this.debugging;
		}
	}
})();