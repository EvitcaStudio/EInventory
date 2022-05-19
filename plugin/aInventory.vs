#ENABLE LOCALCLIENTCODE
#BEGIN CLIENTCODE
#BEGIN JAVASCRIPT
(() => {
/* 	let ticks = 0
	const ticksBeforeAbort = 3000; // (1500 * 4) // 12 seconds. */
	const engineWaitId = setInterval(() => {
		if (VS.Client && VS.World.global && VS.Client.aInterfaceUtils && PIXI.filters) {
			clearInterval(engineWaitId);
			buildClientInventory();
		}/*  else {
			ticks++;
			if (ticks >= ticksBeforeAbort) {
				clearInterval(engineWaitId);
				if (VS.Client) {
					VS.Client.aMes('This library is dependent on the aInterfaceUtils library. This library has not been found.');
				} else {
					console.log('This library is dependent on the aInterfaceUtils library. This library has not been found.')
				}
			}
		} */
	});

	const buildClientInventory = () => {
		let aInventory = {};
		if (VS.World.getCodeType() === 'local') {
			if (VS.World.global.aInventory) {
				aInventory = VS.World.global.aInventory;
			}
		}

		VS.Client.aInventory = aInventory;
		VS.Client.___EVITCA_aInventory = true;
		VS.World.global.aInventory = aInventory;
		
		const GUI_TAG = '_gui';
		const MAX_SLOTS = (VS.World.global.MAX_SLOTS ? VS.World.global.MAX_SLOTS : 20);

		// a reference to the old onConnect, if it exists // if this ever stops working, assign this BEFORE THE CLIENT IS CREATED
		aInventory._onConnect = VS.Type.getFunction('Client', 'onConnect');

		// the function that will be used as the `pClient.onConnect` function
		const onConnect = function() {
			// a reference to the information window that appears when hovering over an item
			VS.World.global.aInventory.infoMenu = this.getInterfaceElement('aInventory_interface', 'infomenu');
			if (VS.World.global.aInventory._onConnect) {
				VS.World.global.aInventory._onConnect.apply(this);
			}
		}

		// assign the custom onConnect function to the client, this is called before `onConnect` is called so it can be assigned this way
		VS.Type.setFunction('Client', 'onConnect', onConnect);

		// create a outline filter that will be used to outline diobs that can be picked up
		aInventory.outlineDefaultThickness = 3;
		aInventory.outlineFilter = new PIXI.filters.OutlineFilter(aInventory.outlineDefaultThickness, 0xFF7F50, 0.1);

		// a variable that tracks if the inventory is *busy* and cannot do any other request until it is finished
		aInventory.busy = false;

		// attach onMouseDown event to client
		if (!aInventory.onMouseDownSet) {
			aInventory._onMouseDown = VS.Client.onMouseDown;
			aInventory.onMouseDownSet = true;
			VS.Client.onMouseDown = function(pDiob, pX, pY, pButton) {
				if (pButton === 1) {
					if (this.mob.canUseInventory) {
						if (!aInventory.busy) {
							if (pDiob && pDiob.type === 'Interface/Inventory_Interface/Slot') {
								const slotElement = pDiob;
								if (slotElement.info.occupied) {
									const slotElementInfo = {};
									VS.Util.copyObject(slotElementInfo, slotElement.info);
									aInventory.heldSlot = { 'slot': slotElement, 'info': slotElementInfo, 'ID': slotElementInfo.item.ID };
									aInventory.isHoldingSlot = true;
									aInventory.grabbing  = true;
									aInventory.hideInfoMenu();
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
				}
				if (aInventory._onMouseDown) {
					aInventory._onMouseDown.apply(this, arguments);
				}
			}
		}

		// attach onMouseUp event to client
		if (!aInventory.onMouseUpSet) {
			aInventory._onMouseUp = VS.Client.onMouseUp;
			aInventory.onMouseUpSet = true;
			VS.Client.onMouseUp = function(pDiob, pX, pY, pButton) {
				if (aInventory._onMouseUp) {
					aInventory._onMouseUp.apply(this, arguments);
				}
				if (pButton === 1) {
					if (this.mob.canUseInventory) {
						if (!aInventory.busy) {
							aInventory.grabbing = false;
							if (pDiob) {
								if (aInventory.heldSlot && pDiob.mapName && pDiob.baseType !== 'Interface') {
									// if this diob is a map diob, drop it onto the map
									aInventory.c_dropItemFromSlot(aInventory.heldSlot);
								} else if (aInventory.heldSlot && pDiob.type === 'Interface/Inventory_Interface/Slot') {
									const slotElement = pDiob;
									if (slotElement.info.occupied) {
										// slotElement has something in it
										aInventory.c_swapSlotItems(aInventory.heldSlot, slotElement);
									} else {
										// slotElement is empty
										aInventory.c_moveSlotItem(aInventory.heldSlot, slotElement)
									}				
								} else if (aInventory.heldSlot && pDiob.type === 'Interface/Inventory_Interface/Inventory_Background') {
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
				}
			}
		}

		aInventory.c_addItemToSlot = function(pItemID, pSlot, pID, pRequiresPrompt=false, pCategory='', pStackable=false, pQuantity=1, pEquippable=false, pCraftsman='') {
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
							slotGUI = slotElement.addOverlay('Overlay/SlotGUI', { 'ownState': true }, true);
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
								
			// packet to add to clientside
			// item is added to the inventory and can be interacted with
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
			if (VS.World.global.aRecycle) {
				item = VS.World.global.aRecycle.isInCollection(VS.Client.mob.c_inventory[pSlotID].type, 1, VS.World.global.aRecycle.basicCollection, false, x, y, map, pQuantity);
			} else {
				item = VS.newDiob(pType, x, y, map, pQuantity);
			}
			if (item.onDrop && typeof(item.onDrop) === 'function') {
				item.onDrop();
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
					// this is temporary
					// call a event function here
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
								VS.Client.sendPacket(VS.World.global.aNetwork.S_AINVENTORY_PACKETS.S_DROP_ITEM_PACKET, [pSlotData.ID, pQuantity]);
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
								VS.World.global.aInterfaceUtils.confirm('Drop <span style="text-decoration: underline; font-weight: bold;"> ' + quantity + ' </span> ' + VS.Type.getVariable(VS.Client.mob.c_inventory[pSlotData.ID].type, 'displayName') + '?', 'Are you sure?', confirmDropItem.bind(this), [pSlotData, quantity]);
							} else {
								this.busy = false;
								this.c_restoreSlot(pSlotData);								
							}
						}
						VS.World.global.aInterfaceUtils.input('How many would you like to drop?', 1, true, inputQuantity.bind(this), [pSlotData]);
						this.busy = true;
					} else {
						VS.World.global.aInterfaceUtils.confirm('Drop ' + VS.Type.getVariable(VS.Client.mob.c_inventory[pSlotData.ID].type, 'displayName') + '?', 'Are you sure?', confirmDropItem.bind(this), [pSlotData, VS.Client.mob.c_inventory[pSlotData.ID].quantity]);
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
									VS.Client.sendPacket(VS.World.global.aNetwork.S_AINVENTORY_PACKETS.S_DROP_ITEM_PACKET, [pSlotData.ID, quantity]);
								}
							} else {
								this.busy = false;
								this.c_restoreSlot(pSlotData);
							}
						}
						VS.World.global.aInterfaceUtils.input('How many would you like to drop?', 1, true, inputQuantity.bind(this), [pSlotData]);
						this.busy = true;
					} else {
						// separate code to be ran if this isn't a multiplayer game
						if (VS.World.getPlayerMode() === 1) {
							this.c_drop(pSlotData.ID);
						} else {
							// if the item does not require a prompt, send a packet to drop the item. The server will remove the item from the inventory if the drop is legal and send a packet back to the client to do the same
							VS.Client.sendPacket(VS.World.global.aNetwork.S_AINVENTORY_PACKETS.S_DROP_ITEM_PACKET, [pSlotData.ID]);
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
			this.hideInfoMenu();
			VS.Client.mob.c_inventory = {};
			if (VS.World.getPlayerMode() !== 1) {
				VS.Client.sendPacket(VS.World.global.aNetwork.S_AINVENTORY_PACKETS.S_WIPE_INVENTORY_PACKET);
			}
		}

		// clears away any binding information from this slot
		aInventory.c_cleanSlot = function(pSlot) {
			if (!this.busy) {
				pSlot.info.occupied = false;
				pSlot.info.item = {};
				pSlot.info.equipped = false;
				pSlot.text = '';
				pSlot.overlays[0].atlasName = ''
				pSlot.overlays[0].iconName = '';
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
				aInventory.showInfoMenu(pSlot2);
				VS.Client.setMouseCursor('pointer');
				if (VS.World.getPlayerMode() !== 1) {
					VS.Client.sendPacket(VS.World.global.aNetwork.S_AINVENTORY_PACKETS.S_SWAP_SLOT_ITEMS_PACKET, [slot1.info.item.ID, pSlot2.info.item.ID, firstSlotNumber, secondSlotNumber]);
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
					slot2GUI = pSlot2.addOverlay('Overlay/SlotGUI', { 'ownState': true }, true);
				}
				slot2GUI.atlasName = VS.Type.getVariable(pSlot2.info.item.type, 'atlasName');
				slot2GUI.iconName = (VS.Type.getVariable(pSlot2.info.item.type, 'iconState') ? VS.Type.getVariable(pSlot2.info.item.type, 'iconState') : VS.Type.getVariable(pSlot2.info.item.type, 'iconName')) + GUI_TAG;

				pSlot2.text = '<div class="aInventory_text aInventory_stackNumber">' + '<sub>' + (VS.Client.mob.c_inventory[pSlot2.info.item.ID].stackable ? VS.Client.mob.c_inventory[pSlot2.info.item.ID].quantity : '') + '</sub></div>';

				this.heldSlot = null;
				this.isHoldingSlot = false;
				aInventory.showInfoMenu(pSlot2);
				VS.Client.setMouseCursor('pointer');
				if (VS.World.getPlayerMode() !== 1) {
					VS.Client.sendPacket(VS.World.global.aNetwork.S_AINVENTORY_PACKETS.S_MOVE_SLOT_ITEM_PACKET, [pSlot2.info.item.ID, pSlot2.info.item.slot]);
				}
			}
		}

		// show a information menu for the item that is in this slot
		aInventory.showInfoMenu = function(pSlot) {
			if (!this.busy) {
				if (this.infoMenu.isHidden) {
					this.infoMenu.show();
					this.infoMenu.text = '<div class="aInventory_text">' + VS.Type.getVariable(pSlot.info.item.type, 'displayName') + '<div class="aKeybinds_floatRight">' + pSlot.info.item.category + '</div><hr>' + VS.Type.getVariable(pSlot.info.item.type, 'description') + '</div>';
					this.positionInfoMenu();
				}
			}
		}

		// hide the information menu
		aInventory.hideInfoMenu = function() {
			if (!this.infoMenu.isHidden) {
				this.infoMenu.hide();
			}
		}

		// position the menu when the mouse moves
		aInventory.positionInfoMenu = function() {
			if (!this.busy) {
				const mousePos = VS.Client.getMousePos();
				let x;
				let y;
				if (this.infoMenu.preventAutoScale) {
					mousePos.x *= VS.Client._screenScale.x;
					mousePos.y *= VS.Client._screenScale.y;
				}

				x = mousePos.x;
				y = mousePos.y - VS.World.global.aInventory.infoMenu.height;

				if (x + VS.World.global.aInventory.infoMenu.width > VS.Client._windowSize.width) {
					x = mousePos.x - VS.World.global.aInventory.infoMenu.width;
				}

				if (y < 0) {
					y = mousePos.y;
				}

				this.infoMenu.setPos(x, y);
			}
		}

		// toggle the debug mode, which allows descriptive text to be shown when things of notice happen
		aInventory.toggleDebug = function() {
			this.debugging = (this.debugging ? false : true);
		}
	}
})();

#END JAVASCRIPT

Interface
	Inventory_Interface
		atlasName = 'aInventory_atlas'

		Label
			width = 270
			height = 50
			mouseOpacity = 0
			touchOpacity = 0
			interfaceType = 'WebBox'
			text = '<span class="aInventory_label">Inventory</span>'
			parentElement = 'inventory_background'


		Inventory_Background
			iconName = 'inventory_background'
			width = 270
			height = 386
			dragOptions = { 'draggable': true, 'parent': true, 'titlebar': { 'width': 270, 'height': 76 } }

		Slot
			iconName = 'slot'
			width = 50
			height = 50
			interfaceType = 'WebBox'
			parentElement = 'inventory_background'
			let info = {
				// if a item in currently in this slot or not
				'occupied': false,
				// the item that this slot is currently holding
				'item': {},
				// if the item is equpped
				'equipped': false
			}

			onMouseMove(pClient, pX, pY)
				if (!aInventory.grabbing && !aInventory.isHoldingSlot)
					if (!aInventory.infoMenu.isHidden)
						aInventory.positionInfoMenu()

			onMouseEnter(pClient, pX, pY)
				if (!pClient.dragging)
					this.iconState = 'highlighted'
					if (!aInventory.grabbing && !aInventory.isHoldingSlot)
						if (this.info.occupied)
							pClient.setMouseCursor('pointer')
							aInventory.showInfoMenu(this)

			onMouseExit(pClient, pX, pY)
				this.iconState = ''
				if (!aInventory.grabbing && !aInventory.isHoldingSlot)
					pClient.setMouseCursor('')
					aInventory.hideInfoMenu()

		InfoMenu
			interfaceType = 'WebBox'
			width = 370
			height = 131
			iconName = 'inventory_info_menu'
			mouseOpacity = 0
			touchOpacity = 0
			plane = 2
			layer = 2

Mob/Player
	let c_inventory = {}

Diob
	GroundItem
		let description = ''
		let displayName = ''

#END CLIENTCODE

#BEGIN JAVASCRIPT
(() => {
	const engineWaitId = setInterval(() => {
		if (VS.World.global) {
			clearInterval(engineWaitId);
			buildServerInventory();
		}
	});

	const buildServerInventory = () => {
		let aInventory = {};
		if (VS.World.getCodeType() === 'local') {
			if (VS.World.global.aInventory) {
				aInventory = VS.World.global.aInventory;
			}
		}

		VS.World.global.aInventory = aInventory;
		
		const MAX_SLOTS = parseInt((VS.World.global.MAX_SLOTS ? VS.World.global.MAX_SLOTS : 20));
		const REACHING_RANGE = parseInt((VS.World.global.REACHING_RANGE ? VS.World.global.REACHING_RANGE : 48));

		aInventory.generateID = function(pID = 3) {
			let ID = '';
			const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

			for (let i = 0; i < pID; i++) {
				ID += chars.charAt(Math.floor(Math.random() * chars.length));
			}
			return ID;
		}

		aInventory.addItemToSlot = function(pClient, pItem) {
			if (pItem && pItem.obtainable && VS.Map.getDist(pClient.mob, pItem) <= REACHING_RANGE) {
				// if you have the max amount of items in your inventory already and the item you are picking up isn't stackable then you can't pick anything up
				if (Object.keys(pClient.mob.inventory).length === MAX_SLOTS && !pItem.stackable) {
					if (this.debugging) {
						console.error('aInventory Module [addItemToSlot]: %cpNo available slots', 'font-weight: bold');
					}
					return;
				}
				// what category this item belongs too
				const category = pItem.category;
				// if this item can represent more than one of itself
				const stackable = pItem.stackable;
				// the current amount of this item represented by this item
				const quantity = pItem.quantity;
				// the max amount of this item that can be represented
				const maxQuantity = pItem.maxQuantity;
				// if this item is equippable
				const equippable = pItem.equippable;
				// if this item was created by a player or something
				const craftsman = pItem.craftsman;
				// if this item requires a prompt to drop
				const requiresPrompt = pItem.requiresPrompt;
				// slots that are currently taken in this inventory
				const occupiedSlots = [];
				// the nearest open slot
				let nearestOpenSlot;
				// type of the item
				const type = pItem.type;

				// get the number of each slot that is currently occupied in this inventory
				for (const item of Object.keys(pClient.mob.inventory)) {
					occupiedSlots.push(pClient.mob.inventory[item].slot);
				}

				// We loop through the max number of slots the inventory can have, and compare the current slot number to if its apart of the occupied slots array.
				for (let i = 1; i <= MAX_SLOTS; i++) {
					if (!occupiedSlots.includes(i)) {
						nearestOpenSlot = i;
						break
					}
				}
				// loop through the inventory and see if this item already exists
				for (const item of Object.keys(pClient.mob.inventory)) {
					// if this item already exists in the inventory
					if (pClient.mob.inventory[item].type === type) {
						// if the item is stackable
						if (stackable) {
							// check that you do not already have the max amount of this item
							if (pClient.mob.inventory[item].quantity !== maxQuantity) {
								// if there is more than on of these items then check if the current amount you have in the inventory will fit
								if (quantity) {
									// if the quantity you are picking up is more than the maxium quantity of the item you already have you must break it up and add it as a new item
									if (pClient.mob.inventory[item].quantity + quantity > maxQuantity) {
										const leftOverQuantity = (pClient.mob.inventory[item].quantity + quantity) - maxQuantity;
										pClient.mob.inventory[item].quantity = VS.Math.clamp(pClient.mob.inventory[item].quantity + quantity, pClient.mob.inventory[item].quantity, maxQuantity);
										pClient.sendPacket(VS.World.global.aNetwork.C_AINVENTORY_PACKETS.C_ADD_ITEM_TO_SLOT_PACKET, [pItem.id, pClient.mob.inventory[item].slot, pClient.mob.inventory[item].ID, undefined, category, 1, pClient.mob.inventory[item].quantity]);
										pItem.quantity = leftOverQuantity;
										// we allowed items to bypass the MAX_SLOTS if they are stackable, since those are not technically items. If you have max slots, then you cannot add the remainder of this item so return out.
										if (Object.keys(pClient.mob.inventory).length === MAX_SLOTS) {
											if (this.debugging) {
												console.error('aInventory Module [addItemToSlot]: %cpNo available slots', 'font-weight: bold');
											}
											return;
										}
										this.addItemToSlot(pClient, pItem);
										return;
									// if you can pick up the full amount of this item, then delete this item
									} else {
										pClient.mob.inventory[item].quantity = VS.Math.clamp(pClient.mob.inventory[item].quantity + quantity, pClient.mob.inventory[item].quantity, maxQuantity);
										pClient.sendPacket(VS.World.global.aNetwork.C_AINVENTORY_PACKETS.C_ADD_ITEM_TO_SLOT_PACKET, [pItem.id, pClient.mob.inventory[item].slot, pClient.mob.inventory[item].ID, undefined, category, 1, pClient.mob.inventory[item].quantity]);
										this.removeItemFromMap(pItem);
									}
									return;
								}
							}
						}
					}
				}

				// if this item does not exist in the inventory already
				// and if this inventory can hold more items
				if (Object.keys(pClient.mob.inventory).length !== MAX_SLOTS) {
					// this item does not exist in the inventory, therefore a new ID for it must be created
					const inventoryItemID = this.generateID();
					while (Object.keys(pClient.mob.inventory).includes(inventoryItemID)) {
						inventoryItemID = this.generateID();
					}
					this.storeItemInInventory(pClient, pItem, inventoryItemID, nearestOpenSlot, requiresPrompt, category, stackable, quantity, equippable, craftsman, type);
				} else {
					if (this.debugging) {
						// there is no room for this item. You cannot pick it up. Send a packet saying `inventory full?`
						console.error('aInventory Module [addItemToSlot]: %cpNo available slots', 'font-weight: bold');
					}				
				}

				// packet to add to clientside
				// item is added to the inventory and can be interacted with
			}
		}

		// stores the item's information in the client's inventory as well as removes this item from the map
		aInventory.storeItemInInventory = function(pClient, pItem, pID, pSlot, pRequiresPrompt, pCategory, pStackable, pQuantity, pEquippable, pCraftsman, pType) {
			pClient.mob.inventory[pID] = {
				'slot': pSlot,
				'category': pCategory,
				'stackable': pStackable,
				'quantity': pQuantity,
				'equippable': pEquippable,
				'craftsman': pCraftsman,
				'requiresPrompt': pRequiresPrompt,
				'ID': pID,
				'type': pType
			}
			pClient.sendPacket(VS.World.global.aNetwork.C_AINVENTORY_PACKETS.C_ADD_ITEM_TO_SLOT_PACKET, [pItem.id, pSlot, pID, pRequiresPrompt, pCategory, pStackable, pQuantity, pEquippable, pCraftsman]);
			this.removeItemFromMap(pItem);
		}

		// a function to add an item to the map
		aInventory.addItemToMap = function(pClient, pType, pX, pY, pMap, pQuantity) {
			let item;
			if (VS.World.global.aRecycle) {
				item = VS.World.global.aRecycle.isInCollection(pType, 1, VS.World.global.aRecycle.basicCollection, false, pX, pY, pMap, pQuantity);
			} else {
				item = VS.newDiob(pType, pX, pY, pMap, pQuantity);
			}
			if (item.onDrop && typeof(item.onDrop) === 'function') {
				item.onDrop();
			}
		}

		// a function to remove or collect this diob from the map
		aInventory.removeItemFromMap = function(pItem) {
			if (pItem.onPickup && typeof(pItem.onPickup) === 'function') {
				pItem.onPickup();
			}
			if (VS.World.global.aRecycle) {
				VS.World.global.aRecycle.collect(pItem, VS.World.global.aRecycle.basicCollection);
			} else {
				VS.delDiob(pItem);
			}
		}

		// function to remove the whole item or apart of it from server and clientside inventory
		aInventory.removeItemFromSlot = function(pClient, pSlotID, pQuantity) {
			// if you have the exact amount of this item that you are dropping, remove the entire item
			if (pClient.mob.inventory[pSlotID].quantity === pQuantity) {
				delete pClient.mob.inventory[pSlotID];
			} else {
				pClient.mob.inventory[pSlotID].quantity -= pQuantity;
			}
			pClient.sendPacket(VS.World.global.aNetwork.C_AINVENTORY_PACKETS.C_REMOVE_ITEM_FROM_SLOT_PACKET, [pSlotID, pQuantity])
		}

		aInventory.updateSlotItem = function(pClient, pSlotID) {

		}

		aInventory.dropItem = function(pClient, pSlotID, pQuantity=1) {
			let quantity = 1;
			// if the item exists in the inventory
			if (pClient.mob.inventory[pSlotID]) {
				if (pQuantity > 1) {
					// you have enough in your inventory to drop this amount
					if (pClient.mob.inventory[pSlotID].quantity >= pQuantity) {
						const value = parseInt(pQuantity);
						quantity = Number.isInteger(value) ? value : 1;
					} else {
						// you do not have this much to drop, drop the max of this item (which means the entire item itself)
						quantity = pClient.mob.inventory[pSlotID].quantity;
					}
				}
				this.addItemToMap(pClient, pClient.mob.inventory[pSlotID].type, pClient.mob.xPos, pClient.mob.yPos, pClient.mob.mapName, quantity);
				this.removeItemFromSlot(pClient, pSlotID, quantity);
			}
		}

		aInventory.getInventory = function(pClient) {
			const copyOfInventory = {};
			VS.Util.copyObject(copyOfInventory, pClient.mob.inventory);
			return copyOfInventory;
		}

		aInventory.wipeInventory = function(pClient) {
			pClient.mob.inventory = {};
			// save data
		}

		// just moving slot data to and from slots
		aInventory.swapSlotItems = function(pClient, pSlotID, pSlot2ID, pSlotNumber, pSlotNumber2) {
			const slotNumber = parseInt(pSlotNumber);
			const slotNumber2 = parseInt(pSlotNumber2);
			
			if (!Number.isInteger(slotNumber) || !Number.isInteger(slotNumber2)) {
				if (this.debugging) {
					console.error('aInventory Module: Invalid %cpSlotNumber | pSlotNumber2', 'font-weight: bold', ' parameter.');
					return;
				}
			}

			if (pClient.mob.inventory[pSlotID] && pClient.mob.inventory[pSlot2ID]) {
				pClient.mob.inventory[pSlotID].slot = pSlotNumber;
				pClient.mob.inventory[pSlot2ID].slot = pSlotNumber2;
			} else {
				if (this.debugging) {
					console.error('aInventory Module: Invalid %cpSlotID && pSlot2ID', 'font-weight: bold', '. These ID\'s do not exist in this pClient.mob.inventory.');
				}
			}
		}

		// move a slot to a empty slot
		aInventory.moveSlotItem = function(pClient, pSlotID, pSlotNumber) {
			let taken = false;
			// if that id exists inside of this inventory
			if (pClient.mob.inventory[pSlotID]) {
				// checks if this new slot is already taken by another item in the inventory
				for (const item of Object.keys(pClient.mob.inventory)) {
					// if this slot is already being used by another item in this inventory, this swap is invalid
					if ((pClient.mob.inventory[item].slot !== pClient.mob.inventory[pSlotID].slot) && pClient.mob.inventory[item].slot === pSlotNumber) {
						taken = true;
						break;
					}
				}
				// if there is no slot that is in this slot, then its free to assign it
				if (!taken) {
					pClient.mob.inventory[pSlotID].slot = pSlotNumber;
				} else {
					if (this.debugging) {
						console.error('aInventory Module: A item in this inventory is already occupying %cpSlotNumber', 'font-weight: bold');
					}
				}
			} else {
				if (this.debugging) {
					console.error('aInventory Module: Invalid %cpSlotID', 'font-weight: bold', '. This ID does not exist in pClient.mob.inventory.');
				}
			}
		}

	}

})();

#END JAVASCRIPT

Mob/Player
	let inventory = {}

Diob
	GroundItem
		// what category this item belongs to
		let category = '';
		// if this item can represent more than one of itself
		let stackable = false;
		// the current amount of this item represented by this item
		let quantity = 1;
		// the max amount of this item that can be represented
		let maxQuantity = 1;
		// if this item is equippable
		let equippable = false;
		// if this item was created by a player or something
		let craftsman = '';
		// if this item is able to be collected
		let obtainable = false
		// if this item requires a prompt to be dropped, use this if the item is special and you don't want the item to be accidentatlly dropped.
		let requiresPrompt = false
		mouseOpacity = 1
		plane = 1
		layer = 4

		onNew(pX, pY, pMap, pQuantity)
			this.setup(pX, pY, pMap, pQuantity)

		function onDumped(pX, pY, pMap, pQuantity)
			this.setup(pX, pY, pMap, pQuantity)

		function setup(pX, pY, pMap, pQuantity)
			if ((pX || pX === 0) && (pY || pY === 0) && pMap)
				if (pQuantity)
					this.quantity = pQuantity
				this.setPos(pX, pY, pMap)
				this.obtainable = true

		function clean()
			this.quantity = 1
			this.obtainable = false

		function onPickup()

		function onDrop()

Overlay
	ChestArmor
	LegArmor
	Cloak
	Chest
	Legs
	Feet
	Weapon
	Hair

Overlay
	SlotGUI
		width = 50
		height = 50
		mouseOpacity = 0
		touchOpacity = 0
		preventAutoScale = true


#BEGIN WEBSTYLE

.aInventory_text, .aInventory_label {
	font-size: 15px;
	padding: 5px;
	font-family: Arial;
	color: #fff;
	text-shadow: rgb(0, 0, 0) 2px 0px 0px, rgb(0, 0, 0) 1.75517px 0.958851px 0px, rgb(0, 0, 0) 1.0806px 1.68294px 0px, rgb(0, 0, 0) 0.141474px 1.99499px 0px, rgb(0, 0, 0) -0.832294px 1.81859px 0px, rgb(0, 0, 0) -1.60229px 1.19694px 0px, rgb(0, 0, 0) -1.97998px 0.28224px 0px, rgb(0, 0, 0) -1.87291px -0.701566px 0px, rgb(0, 0, 0) -1.30729px -1.5136px 0px, rgb(0, 0, 0) -0.421592px -1.95506px 0px, rgb(0, 0, 0) 0.567324px -1.91785px 0px, rgb(0, 0, 0) 1.41734px -1.41108px 0px, rgb(0, 0, 0) 1.92034px -0.558831px 0px;
}

.aKeybinds_floatRight {
	padding-right: 2px;
	float: right;
}

.aInventory_stackNumber {
	padding-right: 5px;
	padding-top: 22px;
	float: right;
}

.aInventory_label {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 25px;
	font-size: 20px;
}

#END WEBSTYLE
