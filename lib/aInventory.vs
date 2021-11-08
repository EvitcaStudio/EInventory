#ENABLE LOCALCLIENTCODE
#BEGIN CLIENTCODE
#BEGIN JAVASCRIPT
(function() {
	let ticks = 0
	let ticksBeforeAbort = 1500; // (1500 * 4) // 6 seconds.
	let engineWaitId = setInterval(function() {
		if (VS.Client && VS.World.global && VS.Client.aInterfaceUtils && PIXI.filters) {
			clearInterval(engineWaitId);
			buildClientInventory();
		} else {
			ticks++;
			if (ticks >= ticksBeforeAbort) {
				clearInterval(engineWaitId);
				if (VS.Client) {
					VS.Client.aMes('This library is dependent on the aInterfaceUtils library. This library has not been found.');
				}
			}
		}
	});

	let buildClientInventory = function() {
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

		// a reference to the old onConnect, if it exists // if this ever stops working, assign this BEFORE THE CLIENT IS CREATED
		aInventory._onConnect = VS.Type.getFunction('Client', 'onConnect');

		// the function that will be used as the `pClient.onConnect` function
		let onConnect = function() {
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

		// attach onMouseDown event to client
		if (!aInventory.onMouseDownSet) {
			aInventory._onMouseDown = VS.Client.onMouseDown;
			aInventory.onMouseDownSet = true;
			VS.Client.onMouseDown = function(pDiob, pX, pY, pButton) {
				if (pButton === 1) {
					if (this.mob.c_inGame) {
						if (pDiob && pDiob.type === 'Interface/Inventory_Interface/Slot') {
							let slotElement = pDiob;
							if (slotElement.info.occupied) {
								let slotElementInfo = {};
								VS.Util.copyObject(slotElementInfo, slotElement.info);
								aInventory.heldSlot = { 'slot': slotElement, 'info': slotElementInfo };
								aInventory.grabbing  = true;
								aInventory.hideInfoMenu();
								if (!this.aInventoryMouseCursor) {
									this.aInventoryMouseCursor = VS.newDiob();
								}
								let atlasName = VS.Type.getVariable(slotElement.info.item.type, 'atlasName');
								let iconName = VS.Type.getVariable(slotElement.info.item.type, 'iconName');
								let iconState = VS.Type.getVariable(slotElement.info.item.type, 'iconState');
								this.aInventoryMouseCursor.atlasName = atlasName;
								this.aInventoryMouseCursor.iconName = iconName;
								this.aInventoryMouseCursor.iconState = iconState;
								this.setMouseCursor(this.aInventoryMouseCursor);
								aInventory.c_cleanSlot(slotElement);
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
					if (this.mob.c_inGame) {
						aInventory.grabbing = false;
						if (pDiob) {
							if (aInventory.heldSlot && pDiob.type === 'Interface/Inventory_Interface/Slot') {
								let slotElement = pDiob;
								// slotElement has something in it
								if (slotElement.info.occupied) {
									aInventory.c_swapSlotItems(aInventory.heldSlot, slotElement);
								// slotElement is empty
								} else {
									aInventory.c_moveSlotItem(aInventory.heldSlot, slotElement)
								} 						
							// if you are holding onto a slot and you have moved it over the inventory background, then this is a illegal drop and the item is returned to its slot
							} else if (aInventory.heldSlot && pDiob.type === 'Interface/Inventory_Interface/Inventory_Background') {

							// if you are holding onto a slot and you have moved it over a interface diob, could be dropping it into another interface for usage?
							} else if (aInventory.heldSlot && pDiob.baseType === 'Interface') {
								// call a event function with helpful paramas to figure out what to do with this item, the event function will have a callback parameter embedded into it, if when called will automatically remove this item from the inventory.
								// maybe this will be able to get a certain quantity of the item that is dropped if requested, and a dialog appears to choose and the callback is passed along?
							}
						}
						return;
						// if you are holding onto a slot and you have moved it over a map diob or no diob at all (a tile since they have no mouseOpacity by default)
						if (aInventory.heldSlot && (!pDiob || pDiob.mapName)) {
							
						}
					}
				}
			}
		}
		// if (!this.isPlayer) return
		// if (!diob) return
		// if (button === 1)
		// 	if (this.slotHolding && Type.isType(diob.type, 'Interface/Inventory/Slot')) // when players "drops" a slot onto another slot
		// 		if (diob.occupied) // if the slot the player drops a slot onto has something in it
		// 			this.mob.swapSlots(this.slotHolding, diob) // swap data from this slot to the other and vice versa
		// 		else /* empty slot */
		// 			this.slotHolding.occupied = null // remove data from old slot
		// 			this.slotHolding.atlasName = ''// remove data from old slot
		// 			this.slotHolding.iconName = ''// remove data from old slot
		// 			diob.holding = this.slotHolding.holding // give new slot old slots data
		// 			diob.atlasName = diob.holding.item.atlasName // swap icon info
		// 			diob.iconName = diob.holding.item.iconName + GUI_TAG // swap icon info
		// 			diob.occupied = true // this slot has something in it now, signify it with changing the var
		// 			this.slotHolding = null // reset your holding slot because you already "dropped" it (job done)!
		// 			this.setMouseCursor()

		// 	else if (this.slotHolding && Type.isType(diob.baseType, 'Tile')) /* Dragging out of inventory and onto the map in a dropping manner */
		// 		this.mob.drop(this.slotHolding.holding.item.id) // just drop the diob, and the `drop` function handles the rest
		// 		this.slotHolding.occupied = null // reset data
		// 		this.slotHolding.atlasName = '' // reset data
		// 		this.slotHolding.iconName = '' // reset data
		// 		this.slotHolding.holding = null // reset data
		// 		this.slotHolding = null // reset data
		// 		this.setMouseCursor()
			
		// 	else if (this.slotHolding && Type.isType(diob.type, 'Interface/Inventory/Background_Image')) /* Dragging out of inventory and onto the map in a dropping manner */
		// 		this.slotHolding = null // reset data
		// 		this.setMouseCursor()
		// 		/* dropping on background */

		aInventory.c_addItemToSlot = function(pItemID, pSlot, pID, pRequiresPrompt=false, pCategory='', pStackable=false, pQuantity=1, pEquippable=false, pCraftsman='') {
			console.log('CLIENT: ', 'pItemID: ' + pItemID, 'pSlot: ' + pSlot, 'pID: ' + pID, 'pRequiresPrompt: ' + pRequiresPrompt, 'pCategory: ' + pCategory, 'pStackable: ' + pStackable, 'pQuantity: ' + pQuantity, 'pEquippable: ' + pEquippable, 'pCraftsman: ' + pCraftsman)
			var item = VS.World.getDiobByID(pItemID);
			var slotElement = VS.Client.getInterfaceElement('aInventory_interface', 'slot'+pSlot);
			var newItem = false;
			var slotGUI;
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
						slotElement.info.item = VS.Client.mob.c_inventory[pID];
						slotElement.text = '<div class="aInventory_text aInventory_stackNumber">' + '<sub>' + (pQuantity > 1 ? pQuantity : '') +'</sub></div>'
					}
					if (!newItem) {
						if (pStackable) {
							if (pQuantity) {
								VS.Client.mob.c_inventory[pID].quantity = pQuantity;
							}
						}
					}
				}
			}
								
			// packet to add to clientside
			// item is added to the inventory and can be interacted with
		}

		aInventory.c_removeItemFromSlot = function(pSlot) {
			// packet to remove the item from clientside
			// item is removed from the inventory all together
			// for like using a item and it naturally removes the slot data from this slot, and doesnt drop or anything
		}

		aInventory.c_dropItemFromSlot = function(pSlot) {
			// on drop event for the item
			// item can be dropped on the map or another interface
		}

		aInventory.c_wipeInventory = function() {

		}

		// clears away any binding information from this slot
		aInventory.c_cleanSlot = function(pSlot) {
			pSlot.info.occupied = false;
			pSlot.info.item = null;
			pSlot.info.equipped = false;
			pSlot.text = '';
			pSlot.overlays[0].atlasName = ''
			pSlot.overlays[0].iconName = '';
		}

		// just moving slot data to and from slots
		aInventory.c_swapSlotItems = function(pSlotData, pSlot2) {
			let slot1Item = pSlotData.info.item;
			let slot2Item = pSlot2.info.item;

			pSlotData.slot.info.item = slot2Item;
			pSlot2.info.item = slot1Item;

			let slot1GUI = pSlotData.slot.overlays[0];
			let slot2GUI = pSlot2.overlays[0];

			slot1GUI.atlasName = VS.Type.getVariable(pSlotData.slot.info.item.type, 'atlasName');
			slot2GUI.atlasName = VS.Type.getVariable(pSlot2.info.item.type, 'atlasName');
			slot1GUI.iconName = (VS.Type.getVariable(pSlotData.slot.info.item.type, 'iconState') ? VS.Type.getVariable(pSlotData.slot.info.item.type, 'iconState') : VS.Type.getVariable(pSlotData.slot.info.item.type, 'iconName')) + GUI_TAG;
			slot2GUI.iconName = (VS.Type.getVariable(pSlot2.info.item.type, 'iconState') ? VS.Type.getVariable(pSlot2.info.item.type, 'iconState') : VS.Type.getVariable(pSlot2.info.item.type, 'iconName')) + GUI_TAG;

			pSlotData.slot.info.occupied = true;
			pSlot2.info.occupied = true;

			pSlotData.slot.text = '<div class="aInventory_text aInventory_stackNumber">' + '<sub>' + (pSlotData.slot.info.item.quantity > 1 ? pSlotData.slot.info.item.quantity : '') +'</sub></div>';
			pSlot2.text = '<div class="aInventory_text aInventory_stackNumber">' + '<sub>' + (pSlot2.info.item.quantity > 1 ? pSlot2.info.item.quantity : '') +'</sub></div>';

			this.heldSlot = null;
			aInventory.showInfoMenu(pSlot2);
			VS.Client.setMouseCursor('pointer');
		}

		// move a slot to a empty slot
		aInventory.c_moveSlotItem = function(pSlotData, pSlot2) {
			let slot2GUI;

			pSlot2.info.item = pSlotData.info.item;
			pSlot2.info.occupied = true;

			if (pSlot2.overlays.length) {
				slot2GUI = pSlot2.overlays[0];
			} else {
				slot2GUI = pSlot2.addOverlay('Overlay/SlotGUI', { 'ownState': true }, true);
			}
			slot2GUI.atlasName = VS.Type.getVariable(pSlot2.info.item.type, 'atlasName');
			slot2GUI.iconName = (VS.Type.getVariable(pSlot2.info.item.type, 'iconState') ? VS.Type.getVariable(pSlot2.info.item.type, 'iconState') : VS.Type.getVariable(pSlot2.info.item.type, 'iconName')) + GUI_TAG;

			pSlot2.text = '<div class="aInventory_text aInventory_stackNumber">' + '<sub>' + (pSlot2.info.item.quantity > 1 ? pSlot2.info.item.quantity : '') +'</sub></div>';

			this.heldSlot = null;
			aInventory.showInfoMenu(pSlot2);
			VS.Client.setMouseCursor('pointer');
		}

		// show a information menu for the item that is in this slot
		aInventory.showInfoMenu = function(pSlot) {
			if (this.infoMenu.isHidden) {
				this.infoMenu.show();
				this.infoMenu.text = '<div class="aInventory_text">' + VS.Type.getVariable(pSlot.info.item.type, 'displayName') + '<div class="aKeybinds_floatRight">' + pSlot.info.item.category + '</div><hr>' + VS.Type.getVariable(pSlot.info.item.type, 'description') + '</div>';
				this.positionInfoMenu();
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
			var mousePos = VS.Client.getMousePos();
			var x;
			var y;
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
			var info = {
				// if a item in currently in this slot or not
				'occupied': false,
				// the item that this slot is currently holding
				'item': null,
				// if the item is equpped
				'equipped': false
			}

			onMouseMove(pClient, pX, pY)
				if (!aInventory.grabbing && !aInventory.heldSlot)
					if (!aInventory.infoMenu.isHidden)
						aInventory.positionInfoMenu()

			onMouseEnter(pClient, pX, pY)
				if (!pClient.dragging)
					this.iconState = 'highlighted'
					if (!aInventory.grabbing && !aInventory.heldSlot)
						if (this.info.occupied)
							pClient.setMouseCursor('pointer')
							aInventory.showInfoMenu(this)

			onMouseExit(pClient, pX, pY)
				this.iconState = ''
				if (!aInventory.grabbing && !aInventory.heldSlot)
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
	var c_inventory = {}

Diob
	GroundItem
		var description = ''
		var displayName = ''

#END CLIENTCODE

#BEGIN JAVASCRIPT
(function() {
	let engineWaitId = setInterval(function() {
		if (VS.World.global) {
			clearInterval(engineWaitId);
			buildServerInventory();
		}
	});

	let buildServerInventory = function() {
		let aInventory = {};
		if (VS.World.getCodeType() === 'local') {
			if (VS.World.global.aInventory) {
				aInventory = VS.World.global.aInventory;
			}
		}

		VS.World.global.aInventory = aInventory;
		
		const MAX_SLOTS = 20;
		const REACHING_RANGE = 48;

		aInventory.generateID = function(pID = 3) {
			var ID = '';
			var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

			for (var i = 0; i < pID; i++) {
				ID += chars.charAt(Math.floor(Math.random() * chars.length));
			}
			return ID;
		}

		aInventory.addItemToSlot = function(pClient, pItem) {
			if (pItem && pItem.obtainable && VS.Map.getDist(pClient.mob, pItem) <= REACHING_RANGE) {
				if (Object.keys(pClient.mob.inventory).length === MAX_SLOTS) {
					console.error('aInventory Module [addItemToSlot]: %cpNo available slots', 'font-weight: bold');
					return;
				}
				// what category this item belongs too
				var category = pItem.category;
				// if this item can represent more than one of itself
				var stackable = pItem.stackable;
				// the current amount of this item represented by this item
				var quantity = pItem.quantity;
				// the max amount of this item that can be represented
				var maxQuantity = pItem.maxQuantity;
				// if this item is equippable
				var equippable = pItem.equippable;
				// if this item was created by a player or something
				var craftsman = pItem.craftsman;
				// if this item requires a prompt to drop
				var requiresPrompt = pItem.requiresPrompt;
				// slots that are currently taken in this inventory
				var occupiedSlots = [];
				// the nearest open slot
				var nearestOpenSlot;
				// type of the item
				var type = pItem.type;

				// get the number of each slot that is currently occupied in this inventory
				for (var item of Object.keys(pClient.mob.inventory)) {
					occupiedSlots.push(pClient.mob.inventory[item].slot);
				}

				// We loop through the max number of slots the inventory can have, and compare the current slot number to if its apart of the occupied slots array.
				for (let i = 1; i <= MAX_SLOTS; i++) {
					if (!occupiedSlots.includes(i)) {
						nearestOpenSlot = i;
						break
					}
				}
				
				var inventoryItemID = this.generateID();
				while (Object.keys(pClient.mob.c_inventory).includes(inventoryItemID)) {
					inventoryItemID = this.generateID();
				}
				
				// loop through the inventory and see if this item already exists
				for (var item of Object.keys(pClient.mob.inventory)) {
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
										var leftOverQuantity = (pClient.mob.inventory[item].quantity + quantity) - maxQuantity;
										pClient.mob.inventory[item].quantity = VS.Math.clamp(pClient.mob.inventory[item].quantity + quantity, pClient.mob.inventory[item].quantity, maxQuantity);
										pClient.sendPacket(VS.World.global.aNetwork.C_AINVENTORY_PACKETS.C_ADD_ITEM_TO_SLOT_PACKET, [pItem.id, pClient.mob.inventory[item].slot, inventoryItemID, undefined, category, 1, pClient.mob.inventory[item].quantity]);
										pItem.quantity = leftOverQuantity;
										this.addItemToSlot(pClient, pItem);
									// if you can pick up the full amount of this item, then delete this item
									} else {
										pClient.mob.inventory[item].quantity = VS.Math.clamp(pClient.mob.inventory[item].quantity + quantity, pClient.mob.inventory[item].quantity, maxQuantity);
										pClient.sendPacket(VS.World.global.aNetwork.C_AINVENTORY_PACKETS.C_ADD_ITEM_TO_SLOT_PACKET, [pItem.id, pClient.mob.inventory[item].slot, inventoryItemID, undefined, category, 1, pClient.mob.inventory[item].quantity]);
										this.removeItemFromMap(pItem);
									}
									return;
								}
							}
						}
					}
				}
				
				// if this item does not exist in the inventory already
				if (occupiedSlots.length !== MAX_SLOTS) {
					this.storeItemInInventory(pClient, pItem, inventoryItemID, nearestOpenSlot, requiresPrompt, category, stackable, quantity, equippable, craftsman, type);
				} else {
					// there is no room for this item. You cannot pick it up. Send a packet saying `inventory full?`
					console.error('aInventory Module [addItemToSlot]: %cpNo available slots', 'font-weight: bold');					
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
		aInventory.addItemToMap = function(pClient/*Extra params*/) {
			if (VS.World.global.aRecycle) {
				// VS.World.global.aRecycle.isInCollection(/*something here*/);
			} else {
				// VS.newDiob(/*something here */);
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

		aInventory.removeItemFromSlot = function(pClient, pSlotID) {
			// packet to remove the item from clientside
			// item is removed from the inventory all together
		}

		aInventory.updateSlotItem = function(pClient, pSlotID) {

		}

		aInventory.lockSlot = function(pClient, pSlotID) {
			// item is locked and no events can be used on item
			// useful for admins
		}

		aInventory.dropItemFromSlot = function(pClient, pSlotID) {
			// on drop event for the item
			// item can be dropped on the map or another interface
		}

		aInventory.getInventory = function(pClient) {

		}

		aInventory.wipeInventory = function(pClient) {

		}

		// clears away any binding information from this slot
		aInventory.cleanSlot = function(pClient, pSlotID) {

		}

		// just moving slot data to and from slots
		aInventory.swapSlotItems = function(pClient, pSlotID, pSlot2ID) {
			if (pClient.mob.inventory[pSlotID] && pClient.mob.inventory[pSlot2ID]) {

			} else {
				console.error('aInventory Module: Invalid %cpSlotID && pSlot2ID', 'font-weight: bold', '. These ID\'s do not exist in this pClient.mob.inventory.)');
			}

		}

		// move a slot to a empty slot
		aInventory.moveSlotItem = function(pClient, pSlotID, pSlot2) {

		}

	}

})();

#END JAVASCRIPT

Mob/Player
	var inventory = {}

Diob
	GroundItem
		// what category this item belongs to
		var category = '';
		// if this item can represent more than one of itself
		var stackable = false;
		// the current amount of this item represented by this item
		var quantity = 1;
		// the max amount of this item that can be represented
		var maxQuantity = 1;
		// if this item is equippable
		var equippable = false;
		// if this item was created by a player or something
		var craftsman = '';
		// if this item is able to be collected
		var obtainable = false
		// if this item requires a prompt to be dropped, use this if the item is special and you don't want the item to be accidentatlly dropped.
		var requiresPrompt = false
		mouseOpacity = 1
		plane = 1
		layer = 4

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