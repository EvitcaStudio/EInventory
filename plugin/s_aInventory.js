(() => {
	const aInventory = {};
	VS.global.aInventory = aInventory;
	
	const MAX_SLOTS = parseInt((VS.global.MAX_SLOTS ? VS.global.MAX_SLOTS : 20));
	const REACHING_RANGE = parseInt((VS.global.REACHING_RANGE ? VS.global.REACHING_RANGE : 48));
	// Set t
	VS.Type.newType('GroundItem', {
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

	aInventory.generateID = function(pID = 3) {
		let ID = '';
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

		for (let i = 0; i < pID; i++) {
			ID += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return ID;
	}

	aInventory.addItemToSlot = function(pClient, pItem) {
		if (!pClient.mob.inventory) {
			pClient.mob.inventory = {};
		}
		if (pItem && pItem.obtainable && VS.Map.getDist(pClient.mob, pItem) <= REACHING_RANGE) {
			// if you have the max amount of items in your inventory already and the item you are picking up isn't stackable then you can't pick anything up
			if (Object.keys(pClient.mob.inventory).length === MAX_SLOTS && !pItem.stackable) {
				if (this.debugging) {
					console.error('aInventory: %cpNo available slots', 'font-weight: bold');
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
			const PROMPT = requiresPrompt ? 1 : 0;
			const STACKABLE = stackable ? 1 : 0;
			const EQUIPABBLE = equippable ? 1 : 0;
			const CRAFTSMAN = craftsman ? 1 : 0;

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
									if (VS.Client.onNetwork && typeof(VS.Client.onNetwork) === 'function') {
										VS.Client.onNetwork('aInventory', 's_addItemToSlot', [pItem.id, pClient.mob.inventory[item].slot, pClient.mob.inventory[item].ID, PROMPT, category, STACKABLE, pClient.mob.inventory[item].quantity, EQUIPABBLE, CRAFTSMAN]);
									}
									pItem.quantity = leftOverQuantity;
									// we allowed items to bypass the MAX_SLOTS if they are stackable, since those are not technically items. If you have max slots, then you cannot add the remainder of this item so return out.
									if (Object.keys(pClient.mob.inventory).length === MAX_SLOTS) {
										if (this.debugging) {
											console.error('aInventory: %cpNo available slots', 'font-weight: bold');
										}
										return;
									}
									this.addItemToSlot(pClient, pItem);
									return;
								// if you can pick up the full amount of this item, then delete this item
								} else {
									pClient.mob.inventory[item].quantity = VS.Math.clamp(pClient.mob.inventory[item].quantity + quantity, pClient.mob.inventory[item].quantity, maxQuantity);
									if (VS.Client.onNetwork && typeof(VS.Client.onNetwork) === 'function') {
										VS.Client.onNetwork('aInventory', 's_addItemToSlot', [pItem.id, pClient.mob.inventory[item].slot, pClient.mob.inventory[item].ID, PROMPT, category, STACKABLE, pClient.mob.inventory[item].quantity, EQUIPABBLE, CRAFTSMAN]);
									}
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
				this.storeItemInInventory(pClient, pItem, inventoryItemID, nearestOpenSlot, PROMPT, category, STACKABLE, quantity, EQUIPABBLE, CRAFTSMAN, type);
			} else {
				if (this.debugging) {
					// there is no room for this item. You cannot pick it up. Send a packet saying `inventory full?`
					console.error('aInventory: %cpNo available slots', 'font-weight: bold');
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
		if (VS.Client.onNetwork && typeof(VS.Client.onNetwork) === 'function') {
			VS.Client.onNetwork('aInventory', 's_addItemToSlot', [pItem.id, pSlot, pID, pRequiresPrompt, pCategory, pStackable, pQuantity, pEquippable, pCraftsman]);
		}
		this.removeItemFromMap(pItem);
	}

	// a function to add an item to the map
	aInventory.addItemToMap = function(pClient, pType, pX, pY, pMap, pQuantity) {
		let item;
		if (VS.global.aRecycle) {
			item = VS.global.aRecycle.isInCollection(pType, 1, VS.global.aRecycle.basicCollection, false, pX, pY, pMap, pQuantity);
		} else {
			item = VS.newDiob(pType, pX, pY, pMap, pQuantity);
		}
		if (item.onDropped && typeof(item.onDropped) === 'function') {
			item.onDropped();
		}
	}

	// a function to remove or collect this diob from the map
	aInventory.removeItemFromMap = function(pItem) {
		if (pItem.onPickup && typeof(pItem.onPickup) === 'function') {
			pItem.onPickup();
		}
		if (VS.global.aRecycle) {
			VS.global.aRecycle.collect(pItem, VS.global.aRecycle.basicCollection);
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
		if (VS.Client.onNetwork && typeof(VS.Client.onNetwork) === 'function') {
			VS.Client.onNetwork('aInventory', 's_removeItemFromSlot', [pSlotID, pQuantity]);
		}
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
		if (VS.Client.onNetwork && typeof(VS.Client.onNetwork) === 'function') {
			// Inventory has just been wiped, saved it now
			VS.Client.onNetwork('aInventory', 's_wipeInventory');
		}
	}

	// just moving slot data to and from slots
	aInventory.swapSlotItems = function(pClient, pSlotID, pSlot2ID, pSlotNumber, pSlotNumber2) {
		const slotNumber = parseInt(pSlotNumber);
		const slotNumber2 = parseInt(pSlotNumber2);
		
		if (!Number.isInteger(slotNumber) || !Number.isInteger(slotNumber2)) {
			if (this.debugging) {
				console.error('aInventory: Invalid %cpSlotNumber | pSlotNumber2', 'font-weight: bold', ' parameter.');
				return;
			}
		}

		if (pClient.mob.inventory[pSlotID] && pClient.mob.inventory[pSlot2ID]) {
			pClient.mob.inventory[pSlotID].slot = pSlotNumber;
			pClient.mob.inventory[pSlot2ID].slot = pSlotNumber2;
		} else {
			if (this.debugging) {
				console.error('aInventory: Invalid %cpSlotID && pSlot2ID', 'font-weight: bold', '. These ID\'s do not exist in this pClient.mob.inventory.');
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
					console.error('aInventory: A item in this inventory is already occupying %cpSlotNumber', 'font-weight: bold');
				}
			}
		} else {
			if (this.debugging) {
				console.error('aInventory: Invalid %cpSlotID', 'font-weight: bold', '. This ID does not exist in pClient.mob.inventory.');
			}
		}
	}

	// toggle the debug mode, which allows descriptive text to be shown when things of notice happen
	aInventory.toggleDebug = function() {
		this.debugging = !this.debugging;
	}
})();