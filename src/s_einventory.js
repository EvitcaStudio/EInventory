(() => {
	const EInventory = {};
	VYLO.global.EInventory = EInventory;
	globalThis.EInventory = EInventory;

	/**
	 * desc: An object full of stored slot types. This is used to reference diob types in mouse events
	 */
	EInventory.storedSlotTypes = {};
	/**
	 * desc: Stored inventories
	 */
	EInventory.storedInventories = {};
	/**
	 * desc: Stored IDs
	 */
	EInventory.storedIDs = [];

	const ZERO = 0;
	const ONE = 1;
	const DEFAULT_MAX_QUANTITY = 1;
	const DEFAULT_MAX_SLOTS = 20;
	const DEFAULT_MAX_DISTANCE = 48;
	const DEFAULT_DENOTAR = '_gui';

	const clamp = (pVal, pMin, pMax) => {
		return Math.max(pMin, Math.min(pVal, pMax));
	}

	class Slot {
		constructor(pSlotNumber) {
			// The number this slot represents
			this._slotNumber = pSlotNumber;
			// The slot element this slot instance is attached to
			this._slotElement = null;
			// The item that this slot is currently holding
			this._item = {};
		}
		/**
		 * desc: Get the itemInfo of this slot's item
		 */
		getItemInfo() {
			return this._item.itemInfo ? this._item.itemInfo : null;
		}
		/**
		 * desc: Returns the quantity of this item
		 */
		getItemQuantity() {
			return this._item.quantity ? this._item.quantity : 0;
		}
		/**
		 * desc: Returns the type of item this slot holds
		 */
		getItemType() {
			return this._item.type ? this._item.type : null;
		}
		/**
		 * desc: Returns the item this slot holds
		 */
		getItem() {
			return this.hasItem() ? JSON.parse(JSON.stringify(this._item)) : null;
		}
		/**
		 * desc: Returns the item this slot holds
		 */
		get item() {
			return this.hasItem() ? JSON.parse(JSON.stringify(this._item)) : null;
		}
		/**
		 * desc: Returns the slot number this slot uses
		 */
		getSlotNumber() {
			return this._slotNumber;
		}
		/**
		 * desc: Returns the slot number this slot uses
		 */
		get slotNumber() {
			return this._slotNumber;
		}
		/**
		 * desc: Returns the interface this slot belongs to
		 */
		getParent() {
			return this._parent;
		}
		/**
		 * desc: Returns the interface this slot belongs to
		 */
		get parent() {
			return this._parent;
		}
		/**
		 * desc: If this item has a item in it or not
		 */
		hasItem() {
			return this.getItemType() ? true : false;
		}
		/**
		 * desc: Remove the properties from this slot's _item variable.
		 */
		wipe() {
			for (const prop in this._item) {
				delete this._item[prop];
			}
		}
	}

	class Inventory {
		constructor(pSettings) {
			this._interface = pSettings.interface;
			this._itemAtlasName = pSettings.itemAtlasName;
			this._global = pSettings.global;
			this._maxSlots = pSettings.maxSlots;
			this._maxDistance = pSettings.maxDistance;
			this._slotClassList = pSettings.slotClassList;
			this._slotType = pSettings.slotType;
			this._denotar = pSettings.denotar;
			this._sendItemInfo = pSettings.sendItemInfo;
			this._client = pSettings.client;
			this._id = pSettings.id;
			// All slots in this inventory
			this._slots = {};
			// The types that this inventory can pick up, and can have dragged into its slots
			this._registeredTypes = [...pSettings.registeredTypes];
			// Whether or not this inventory is locked or not, and can add or remove things from its slots
			this._locked = false;
			this.generateSlots(this._maxSlots);
		}
		/**
		 * desc: Get the max distance this inventory allows items to be picked up
		 */
		getMaxDistance() {
			return this._maxDistance;
		}
		/**
		 * desc: Gets the slot at the specified number
		 */
		getSlot(pSlotNumber) {
			return this._slots[pSlotNumber] ? this._slots[pSlotNumber] : undefined;
		}
		/**
		 * desc: Get the id of this inventory
		 */
		getID() {
			return this._id;
		}
		/**
		 * desc: The client this inventory belongs too
		 */
		getClient() {
			return this._client;
		}
		/**
		 * desc: Get the inventory in save data format
		 */
		getStorage() {
			const storage = {};
			for (let i = 0; i < this._maxSlots; i++) {
				storage[i] = this.getSlot(i)._item;
			}
			return storage;			
		}
		/**
		 * desc: Get the inventory in save data format
		 */
		get storage() {
			return this.getStorage();
		}
		/**
		 * pMaxSlots: The amount of slots this inventory uses
		 * desc: Generates a slot class instance for every slot element in this interface and attaches the slot element to it
		 */
		generateSlots(pMaxSlots) {
			for (let i = 0; i < pMaxSlots; i++) {
				const slotElementNumber = i + 1;
				this._slots[i] = new Slot(i);
				this._slots[i]._parent = this;
			}
		}
		/**
		 * desc: Returns if this inventory is global or not
		 */
		isGlobal() {
			return this._global;
		}
		/**
		 * desc: Returns if the inventory has all of its slots filled
		 */
		isMaxed() {
			let maxed = true;
			for (let i = 0; i < this._maxSlots; i++) {
				if (!this.getSlot(i).hasItem()) {
					maxed = false;
					break;
				}
			}
			return maxed;
		}
		/**
		 * desc: Return the nearest open slot that does not have any items
		 */
		getOpenSlot() {
			let openSlot;
			for (let i = 0; i < this._maxSlots; i++) {
				if (!this.getSlot(i).hasItem()) {
					openSlot = i;
					break;
				}
			}
			return openSlot;
		}
		/**
		 * pType: The type to register
		 * desc: Registers this type so that it can be added to this inventory
		 */
		registerType(pType) {
			if (VYLO.Type.isType(pType)) {
				if (!this._registeredTypes.includes(pType)) {
					this._registeredTypes.push(pType);
				}
			} else {
				console.warn('EInventory: This is not a valid type. Registration failed');
			}
		}
		/**
		 * pType: The type to unregister
		 * desc: Unregisters this type so that it can no longer be added to this inventory
		 */
		unRegisterType(pType) {
			if (this._registeredTypes.includes(pType)) {
				this._registeredTypes.splice(this._registeredTypes.indexOf(pType), 1);
			}
		}
		/**
		 * desc: If this inventory is locked or not
		 */
		isLocked() {
			return this._locked;
		}
		/**
		 * desc: Locks this inventory so it can't accept new items and can't remove old items
		 */
		lock() {
			this._locked = true;
		}
		/**
		 * desc: Unlocks this inventory so it can accept new items and remove old items
		 */
		unlock() {
			this._locked = false;
		}
		/**
		 * desc: Whether or not this inventory should send itemInfo to the client
		 */
		canSendItemInfo() {
			return this._sendItemInfo;
		}
		/**
		 * pType: The type that will be added to the map
		 * pX: The x position this item will appear in
		 * pY: The y position this item will appear in
		 * pMap: The map this item will appear on
		 * pQuantity: The quantity this item will have when dropped
		 * desc: Add item to the map since it was dropped
		 */
		static addItemToMap(pType, pX, pY, pMap, pItemInfo, pQuantity) {
			const item = VYLO.newDiob(pType);
			if (pItemInfo) item.itemInfo = pItemInfo;
			if (pQuantity) item.quantity = pQuantity;
			item.setPos(pX, pY, pMap);
			if (typeof(item.onDropped) === 'function') {
				item.onDropped();
			}
		}
		/**
		 * pItem: The item to remove from the map
		 * desc: Removes this item from the map since it was obtained
		 */
		static removeItemFromMap(pItem) {
			if (typeof(pItem.onPickup) === 'function') {
				pItem.onPickup();
			}

			VYLO.delDiob(pItem);
		}
		/**
		 * pItemID: The id of the diob you want to autheticate server side
		 * desc: This will autheticate the item and see if its a valid item and it will pick it up if it is
		 */
		authenticateItemRequest(pItemID) {
			this.obtain(pItemID);
		}
		/**
		 * pItemType: The type to check the eligibility of
		 */
		isEligibleType(pItemType) {
			let childType = false;
			// Allows children types of a registered type to be added
			for (const rT of this._registeredTypes) {
				if (VYLO.Type.isType(pItemType, rT)) {
					childType = true;
					break
				}
			}
			// If this is not an registered type or a child of a registered type this cannot be added to the inventory
			if (!this._registeredTypes.includes(pItemType) && !childType) {
				console.error('EInventory: This type(' + pItemType + ') is not of a registered type with this inventory.');
				return false;
			}
			return true;
		}
		/** 
		 * pItem: The item to check the eligbility of
		 * desc: This will check if the item is eligible to go into this inventory
		 */
		isEligibleItem(pItem) {
			if (pItem) {
				if (!pItem.obtainable) {
					console.error('EInventory: This item(' + pItem.id + ') is not obtainable.');
					return false;
				}
				if (!this.isEligibleType(pItem.type)) {
					return false;
				}
				// Things that can be stacked have a quantity variable. If there is no quantity set then this is not a stackable item
				// If the inventory is full, and you pick up a item that is stackable, it will still check if it can be added to another stack instead of returning out.
				if (this.isMaxed() && !pItem.quantity) {
					console.error('EInventory: %cpNo available slots', 'font-weight: bold');
					return false;
				}
				if (VYLO.Map.getDist(this.getClient().mob, pItem) > this.getMaxDistance()) {
					console.error('EInventory: This item(' + pItem.id + ') is out of range.');
					return false;
				}
			} else {
				console.error('EInventory: No item passed!');
				return false;
			}
			return true;
		}
		/**
		 * pItemID: The diob you want to pick up
		 * desc: If the game is ran in a multiplayer environment then the item will be autheticated by the server, this is to prevent spoofing of items
		 */
		obtain(pItemID) {
			const item = VYLO.World.getDiobByID(pItemID);
			if (item) {
				if (this.isEligibleItem(item)) {
					this.addItem(item);
				}
			}
		}
		/**
		 * pItem: An object holding all information about the item being added to the inventory.
		 * pItem.quantity: How many of this item will be added to the inventory
		 * pItem.itemInfo: The data to store from this item
		 * desc: Add the item to the inventory, must do all checking here
		 */
		addItem(pItem) {
			// If this inventory is locked you cannot use it.
			if (this.isLocked()) {
				console.warn('EInventory: This inventory is currently locked. Unlock it to pick up this item');
				return;
			}
			const type = pItem.type;
			const quantity = pItem.quantity;
			const itemInfo = pItem.itemInfo ? pItem.itemInfo : VYLO.Type.getVariable(type, 'itemInfo') ? VYLO.Type.getVariable(type, 'itemInfo') : VYLO.Type.getStaticVariable(type, 'itemInfo');
			const formattedItemData = { 0: pItem.id };
			if (quantity) {
				formattedItemData[1] = quantity;
			}
			if (itemInfo && this.canSendItemInfo()) {
				formattedItemData[2] = itemInfo;
			}
			// Search through the slots in the inventory to see if this item already exists
			for (const slot in this._slots) {
				if (this.getSlot(slot).getItemType() === type) {
					const slotQuantity = this.getSlot(slot).getItemQuantity();
					// If this item has a quantity, it means it can be stacked
					if (quantity) {
						// Checks the instance's maxQuantity first, then the types variable, then the static variable, then if nothing is found it uses the default value
						const maxQuantity = pItem.maxQuantity ? pItem.maxQuantity : VYLO.Type.getVariable(type, 'maxQuantity') ? VYLO.Type.getVariable(type, 'maxQuantity') : VYLO.Type.getStaticVariable(type, 'maxQuantity') ? VYLO.Type.getStaticVariable(type, 'maxQuantity') : DEFAULT_MAX_QUANTITY;
						// If this slot is not full and it isn't a full stack of items being added
						if (slotQuantity !== maxQuantity) {
							if (slotQuantity + quantity > maxQuantity) {
								const leftOverQuantity = Math.max((slotQuantity + quantity) - maxQuantity, 1);
								this.getSlot(slot)._item.quantity = clamp(slotQuantity + quantity, slotQuantity, maxQuantity);
								formattedItemData[1] = this.getSlot(slot)._item.quantity;
								if (itemInfo) {
									this.getSlot(slot)._item.itemInfo = itemInfo;
								}
										
								if (typeof(this.getClient().onNetwork) === 'function') {
									this.getClient().onNetwork('EInventory', 'addItem', [[this.getID(), formattedItemData, slot]]);
								}

								pItem.quantity = leftOverQuantity;
								// If you have more space in the inventory, add the remaining stack as a new item
								this.addItem(pItem);
								return;
							// If you can pick up the full amount of this item, then remove this item from this map
							} else {
								this.getSlot(slot)._item.quantity = clamp(slotQuantity + quantity, slotQuantity, maxQuantity);
								formattedItemData[1] = this.getSlot(slot)._item.quantity;
								if (itemInfo) {
									this.getSlot(slot)._item.itemInfo = itemInfo;
								}
										
								if (typeof(this.getClient().onNetwork) === 'function') {
									this.getClient().onNetwork('EInventory', 'addItem', [[this.getID(), formattedItemData, slot]]);
								} 

								Inventory.removeItemFromMap(pItem);
								return;
							}
						}
					}
				}
			}

			if (this.isMaxed()) {
				console.error('EInventory: %cpNo available slots', 'font-weight: bold');
				return;
			}
				
			const nearestSlot = this.getOpenSlot();
			this.getSlot(nearestSlot)._item.type = type;
			if (quantity) {
				this.getSlot(nearestSlot)._item.quantity = quantity;
			}
			if (itemInfo) {
				this.getSlot(nearestSlot)._item.itemInfo = itemInfo;
			}
					
			if (typeof(this.getClient().onNetwork) === 'function') {	
				this.getClient().onNetwork('EInventory', 'addItem', [[this.getID(), formattedItemData, nearestSlot]]);
			} 

			Inventory.removeItemFromMap(pItem);
		}
		/**
		 * pSlotNumber: The slot number to remove the item from
		 * pQuantity: The amount to remove from this slot
		 * desc: This will update the slots quantity with the new quantity after you remove pQuantity's amount
		 * INTERNAL API
		 */
		discardQuantity(pSlotNumber, pQuantity) {
			// Get the amount of stacked items you have
			const quantity = this.getSlot(pSlotNumber).getItemQuantity();
			// If there is no stored quantity in this slot, and there was no passed quantity to drop then the slot needs to be wiped since it was only one item
			// If there was no quantity in this slot at all, even if a quantity was passed then this slot needs to be wiped since it was only one item
			// If pQuantity is greater than the stored quantity then we wipe the slot
			if ((!quantity && !pQuantity) || !quantity || pQuantity >= quantity) {
				this.getSlot(pSlotNumber).wipe();
			} else {
				this.getSlot(pSlotNumber)._item.quantity = Math.max(quantity - pQuantity, ONE);
			}
		}
		/**
		 * pSlotNumber: The slot number to remove the item from
		 * pQuantity: The amount to remove from this slot
		 * desc: This will update the slots quantity with the new quantity after you remove pQuantity's amount
		 */
		removeQuantity(pSlotNumber, pQuantity) {
			this.discardQuantity(pSlotNumber, pQuantity);
			// Send packet to remove this amount from the client's inventory
			if (typeof(this.getClient().onNetwork) === 'function') {
				this.getClient().onNetwork('EInventory', 'removeQuantity', [[this.getID(), pSlotNumber, pQuantity]]);
			}			
		}
		/**
		 * pSlotNumber: Relinguish the data in this slot
		 * pQuantity: The amount to remove
		 * desc: This will drop the item inside of this slot number
		 */
		removeItem(pSlotNumber, pQuantity) {
			if (this.isLocked()) {
				console.warn('EInventory: This inventory is currently locked. Unlock it to remove this item');
				return;
			}
			const itemInfo = this.getSlot(pSlotNumber).getItemInfo();
			const quantity = this.getSlot(pSlotNumber).getItemQuantity();
			// Under this condition this means that the user does not want to drop anything, the item has a stack but they inputted 0
			if (quantity & !pQuantity) return;
			// Clamp the amount to drop down to what you have available to drop to prevent duplicate item bugs
			pQuantity = clamp(pQuantity, !quantity ? ZERO : ONE, quantity);
			const quantityToDrop = clamp(!quantity ? ZERO : pQuantity, !quantity ? ZERO : ONE, quantity);
			const type = this.getSlot(pSlotNumber).getItemType();
			const dissapearOnDrop = VYLO.Type.getVariable(type, 'dissapearOnDrop') ? VYLO.Type.getVariable(type, 'dissapearOnDrop') : VYLO.Type.getStaticVariable(type, 'dissapearOnDrop');
			if (!dissapearOnDrop) {
				Inventory.addItemToMap(type, this.getClient().mob.xPos, this.getClient().mob.yPos, this.getClient().mob.mapName, itemInfo, quantityToDrop);
			}
			this.discardQuantity(pSlotNumber, pQuantity);
			// Send packet to remove item. The server will remove the item from the inventory if the removal is legal and send a packet back to the client to do the same
			if (typeof(this.getClient().onNetwork) === 'function') {
				this.getClient().onNetwork('EInventory', 'removeItem', [[this.getID(), pSlotNumber, pQuantity]]);
			}
		}
		/**
		 * pInventoryID: The inventory the slot is going to, could be the same inventory as this, or it could be different inventory
		 * pSlotNumber1: Slot number that references the slot you are holding
		 * pSlotNumber2: Slot number that references the slot you are moving to
		 * desc: Moves a slot to an empty slot
		 */
		moveSlot(pInventoryID, pSlotNumber1, pSlotNumber2) {
			if (!this.isLocked()) {
				const slotInstance1 = this.getSlot(pSlotNumber1);
				const slotInstance2 = EInventory.getInventoryByID(pInventoryID)._slots[pSlotNumber2];
				// We get the inventory of this new slot, since dragging to a different is a valid action
				const inventory = slotInstance2.getParent();
				if (inventory.isEligibleType(slotInstance1.getItemType())) {
					const slot1InstanceData = slotInstance1.getItem();

					slotInstance1.wipe();
					slotInstance2._item = slot1InstanceData;
				}
			}
		}
		/**
		 * pInventoryID: The inventory the slot is going to, could be the same inventory as this, or it could be different inventory
		 * pSlotNumber1: Slot number that references the slot you are holding
		 * pSlotNumber2: Slot number that references the slot you are moving to and attempting a swap with
		 * desc: Swaps the items in the inventory
		 */
		swapSlots(pInventoryID, pSlotNumber1, pSlotNumber2) {
			if (!this.isLocked()) {
				const slotInstance1 = this.getSlot(pSlotNumber1);
				const slotInstance2 = EInventory.getInventoryByID(pInventoryID)._slots[pSlotNumber2];
				// We get the inventory of this new slot, since dragging to a different is a valid action
				const inventory = slotInstance2.getParent();
				// Inventory most times will be a reference to this interface itself, if a user is swapping items between the same inventory
				// It also has a the ability to be another inventory as well though, due to the ability to move items to a fro another inventory entirely
				// We check if the item inside of slotInstance2 is a valid type for this inventory
				// We check if the item inside of slotInstance1 is a valid type for the new inventory
				if (this.isEligibleType(slotInstance2.getItemType()) && inventory.isEligibleType(slotInstance1.getItemType())) {
					const slot1InstanceData = slotInstance1.getItem();
					const slot2InstanceData = slotInstance2.getItem();

					slotInstance1._item = slot2InstanceData;
					slotInstance2._item = slot1InstanceData;
				}
			}
		}
	}
	/**
	 * desc: Returns a unique ID for use
	 */
	EInventory.generateID = function(pID = 7) {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const makeID = function() {
			let ID = '';
			for (let i = 0; i < pID; i++) {
				ID += chars.charAt(Math.floor(Math.random() * chars.length));
			}
			return ID;
		}
		let ID = makeID();
		while(this.storedIDs.includes(ID)) {
			ID = makeID();
		}
		this.storedIDs.push(ID);
		return ID;
	}

	/**
	 * pSettings: Object holding the settings for this inventory
	 * pSettings.interface: The interface the will be used for this inventory
	 * pSettings.itemAtlasName: The atlas file where this inventory can reference where to find icons for it's items it picks up
	 * pSettings.global: If this inventory can move items from its slots to another inventory's slot. (Needs to adhere to the registeredTypes still)
	 * pSettings.maxSlots: The max amount of slots this inventory uses. This is used to check if its full or not
	 * pSettings.maxDistance: The max amount of distance that can be between the the player and item being picked up
	 * pSettings.slotType: The slot type to be used
	 * pSettings.sendItemInfo: If this inventory will send over the itemInfo of a item.
	 * pSettings.slotClassList: The classes that will be assigned to the slot element when it has a quantity to show.
	 * pSettings.registeredTypes: The allowed types that this inventory can store in an array. If the type is not registered the inventory will not allow it to be stored.
	 * pSettings.denotar: The suffix this inventory will append to the items's iconName that it picks up. This will be used to find the appropriate icon per item stored. The default is "_gui"
	 * pSettings.disableDefaultDrop: If this inventory will prevent the default action for dropping items. This means the user will drop things themselves.
	 */
	EInventory.createInventory = function(pClient, pSettings) {
		const MAX_REGISTERED_TYPES = 50;
		const USE_DEFAULT = 0;
		if (typeof(pSettings) === 'object' && pSettings.constructor === Object) {
			if (!pSettings.interface) {
				console.error('EInventory: The pSettings.interface string could not be found. Initialization failed.');
				return;					
			}
			if (!pSettings.itemAtlasName) {
				console.error('EInventory: The pSettings.itemAtlasName string could not be found. Initialization failed.');
				return;					
			}
			if (typeof(pSettings.slotType) !== 'string') {
				console.error('EInventory: The pSettings.slotType is of the wrong type. Expecting a string. Initialization failed.');
				return;
			}
			if (!pSettings.slotType) {
				console.error('EInventory: pSettings.slotType was not found! This is a needed property');
				return;
			}
			if (!pSettings.clientVariable) {
				console.error('EInventory: pSettings.clientVariable was not found! This is a needed property');
				return;
			}
			if (pSettings.sendItemInfo) {
				pSettings.sendItemInfo = ONE;
			} else {
				pSettings.sendItemInfo = USE_DEFAULT;
			}

			if (pSettings.global) {
				pSettings.global = ONE;
			} else {
				pSettings.global = USE_DEFAULT;
			}

			if (!pSettings.denotar) pSettings.denotar = USE_DEFAULT;
			if (pSettings.disableDefaultDrop) pSettings.disableDefaultDrop = ONE;
			pSettings.maxSlots = typeof(pSettings.maxSlots) !== 'number' ? USE_DEFAULT : Math.round(pSettings.maxSlots);
			pSettings.maxDistance = typeof(pSettings.maxDistance) !== 'number' ? USE_DEFAULT : Math.round(pSettings.maxDistance);
			
			if (!Array.isArray(pSettings.slotClassList)) {
				pSettings.slotClassList = USE_DEFAULT;
				console.error('EInventory: The pSettings.slotClassList is not of the Array type.');
			}
			if (!Array.isArray(pSettings.registeredTypes)) {
				pSettings.registeredTypes = USE_DEFAULT;
				console.warn('EInventory: This inventory has no registered types to accept. It will not be able to store anything until a type is registered!');
			} else if (pSettings.registeredTypes.length > MAX_REGISTERED_TYPES) {
				pSettings.registeredTypes = [];
				console.error('EInventory: This inventory has TOO MANY registered types to accept. There is a hard limit set because this data has to travel over the network');
				return;
			}

			const ID = this.generateID();
			pSettings.id = ID;
			pSettings.client = pClient;
			const inventory = new Inventory(pSettings);
			this.storedInventories[pSettings.id] = inventory;
			if (typeof(pClient.onNetwork) === 'function') {
				pClient.onNetwork('EInventory', 'createInventory', [[pSettings.interface, pSettings.itemAtlasName, pSettings.slotType, pSettings.global, pSettings.maxSlots, pSettings.maxDistance, pSettings.slotClassList, pSettings.registeredTypes, pSettings.denotar, pSettings.id, pSettings.clientVariable, pSettings.disableDefaultDrop]]);
			}
			return inventory;
		} else {
			console.warn('EInventory: Invalid type passed for pSettings');
		}
	}

	EInventory.getInventoryByID = function(pInventoryID) {
		return this.storedInventories[pInventoryID];
	}

	EInventory.isHoldingItem = function() {
		return this.grabbing ? true : false;
	}

	EInventory.toggleDebug = function() {
		this.debugging = !this.debugging;
	}

})();
