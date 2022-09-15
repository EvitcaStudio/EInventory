(() => {
	const engineWaitId = setInterval(() => {
		if (VS.Client) {
			clearInterval(engineWaitId);
			buildClientInventory();
		}
	});
	
	const buildClientInventory = () => {
		const aInventory = {};
		VS.Client.___EVITCA_aInventory = true;
		VS.Client.aInventory = aInventory;
		window.aInventory = aInventory;
		VS.Client.addWebStyle('aInventory_input', '.aInventory_modal{display:none;position:fixed;font-family:Arial;z-index:999999;padding-top:100px;left:0;top:0;width:100%;height:100%;overflow:auto;background-color:rgb(0,0,0);background-color:rgba(0,0,0,.4);user-select:none}.aInventory_modalContent{background-color:#fefefe;margin:auto;padding:20px;border:1px solid #888;border-radius:20px;width:15%}.aInventory_modalInput{width:100%}.aInventory_modalClose{color:#aaa;float:right;font-size:28px;font-weight:700}.aInventory_modalClose:hover,.aInventory_modalClose:focus{color:#000;text-decoration:none;cursor:pointer}.aInventory_animateZoom{animation:aInventory_animatezoom 0.3s}@keyframes aInventory_animatezoom{from{transform:scale(0)}to{transform:scale(1)}}');
		VS.Client.createInterface('aInterface_input_interface');
		const interface = VS.newDiob('Interface');
		const WINDOW_SIZE = VS.Client.getWindowSize();
		interface.interfaceType = 'WebBox';
		interface.width = WINDOW_SIZE.width;
		interface.height = WINDOW_SIZE.height;
		interface.mouseOpacity = 0;
		interface.touchOpacity = 0;
		interface.preventAutoScale = true;
		VS.Client.addInterfaceElement(interface, 'aInterface_input_interface', 'aInterface_input', 0, 0);
		interface.text = '<div class=aInventory_modal id=aInventory_modal><div class="aInventory_animateZoom aInventory_modalContent"><span class=aInventory_modalClose id=aInventory_modalClose>×</span><p id=aInventory_modalTitleContent>Drop how many?<form><div><input class=aInventory_modalInput id=aInventory_modalInput min="0" placeholder="1" type="number" value="1"><p><button id=aInventory_submit type=button>Ok</button></div></form></div></div>';
		VS.Client.showInterface('aInterface_input_interface');
		VS.global.aInventory = aInventory;

		/**
		 * desc: An object full of stored slot types. This is used to reference diob types in mouse events
		 */
		aInventory.storedSlotTypes = {};
		/**
		 * desc: An object full of each inventory created stored via ID, this is used in a SERVER-CLIENT relationship
		 */
		aInventory.storedInventories = {};

		/**
		 * pSlotElement: The element that will have this overlay placed on it
		 * desc: Add this overlay to pSlotElement
		 */
		aInventory.highlightSlot = function(pSlotElement) {
			if (this.slotHighlight) {
				if (!pSlotElement.getOverlays().includes(this.slotHighlight)) {
					pSlotElement.addOverlay(this.slotHighlight);
				}
			}
		}
		/**
		 * pSlotElement: The element that will have this overlay placed on it
		 * desc: Remove the overlay from pSlotElement
		 */
		aInventory.unhighlightSlot = function(pSlotElement) {
			if (pSlotElement.getOverlays().includes(this.slotHighlight)) {
				pSlotElement.removeOverlay(this.slotHighlight, true);
			}
		}

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
				// The overlay used to show the icon of the item in the slot
				this._overlay = VS.newDiob('Overlay');
				// Remove touch events and mouse events for this overlay
				this._overlay.touchOpacity = 0;
				this._overlay.mouseOpacity = 0;
				// Add appearmask
				this._overlay.appearMask = { 'ownState': true, 'ownAnim': true, 'ownMod': true };
				// Animate sync if an overlay is animated
				this._overlay.animator = { 'sync': 'aInventory_overlay_sync'};
				// Prevent auto scale
				this._overlay.preventAutoScale = true;
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
			 * desc: Hides the icon of the slot's item and hides the stack count if there is one
			 */
			hideInfo() {
				this._overlay.atlasName = '';
				this._overlay.iconName = '';
				this._slotElement.text = '';			
			}
			/**
			 * desc: Refreshes the slot's icon and its stack to reflect the latest data
			 */
			refresh() {
				const type = this.getItemType();
				const quantity = this.getItemQuantity();
				this._overlay.atlasName = type ? VS.Type.getVariable(type, 'atlasName') : '';
				this._overlay.iconName = type ? (VS.Type.getVariable(type, 'iconState') ? VS.Type.getVariable(type, 'iconState') : VS.Type.getVariable(type, 'iconName')) + this.getParent()._denotar : '';
				if (quantity) {
					this._slotElement.text = '<div class="' + this.getParent()._slotClassList.join(' ') + '">' + '<sub>' + quantity + '</sub></div>';
				} else {
					this._slotElement.text = '';
				}
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
				this._id = pSettings.id;
				this._disableDefaultDrop = pSettings.disableDefaultDrop;
				// All slots in this inventory
				this._slots = {};
				// The types that this inventory can pick up, and can have dragged into its slots
				this._registeredTypes = [...pSettings.registeredTypes];
				// Whether or not this inventory is locked or not, and can add or remove things from its slots
				this._locked = false;
				this.generateSlots(this._maxSlots);
			}
			/**
			 * desc: If the default drop action is disabled. This is normally used when a user wants to create their own system from dropping things. They will call `removeItem` themselves.
			 */
			dropIsDisabled() {
				return this._disableDefaultDrop;
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
				const slotWidth = VS.Type.getVariable(this._slotType, 'width');
				const slotHeight = VS.Type.getVariable(this._slotType, 'height');
				for (let i = 0; i < pMaxSlots; i++) {
					const slotElementNumber = i + 1;
					const slotElement = VS.Client.getInterfaceElement(this._interface, 'slot_' + slotElementNumber);
					this._slots[i] = new Slot(i);
					// The overlay that will be used to show all items in the inventory per slot
					const overlay = this._slots[i]._overlay;
					// Assign the dimensions to the overlay so it fits correctly
					overlay.width = slotWidth;
					overlay.height = slotHeight;
					this._slots[i]._parent = this;
					this._slots[i]._slotElement = slotElement;
					// Add the overlay that will show all picked up items
					slotElement.addOverlay(overlay);
					slotElement.slotInstance = this._slots[i];
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
				if (VS.Type.isType(pType)) {
					if (!this._registeredTypes.includes(pType)) {
						this._registeredTypes.push(pType);
					}
				} else {
					console.warn('aInventory: This is not a valid type. Registration failed');
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
			 * pType: The type that will be added to the map
			 * pX: The x position this item will appear in
			 * pY: The y position this item will appear in
			 * pMap: The map this item will appear on
			 * pQuantity: The quantity this item will have when dropped
			 * desc: Add item to the map since it was dropped
			 */
			static addItemToMap(pType, pX, pY, pMap, pItemInfo, pQuantity) {
				const item = VS.newDiob(pType);
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

				VS.delDiob(pItem);
			}
			/**
			 * pItemID: The id of the diob you want to pick up
			 * desc: This will cause a network event to be called so a developer can call the proper packets and send the authenticate packet to the server.
			 * The packet will only be sent if the id is a valid id of a diob
			 */
			static authenticateItemRequest(pInventoryID, pItemID) {
				if (typeof(VS.Client.onNetwork) === 'function') {
					VS.Client.onNetwork('aInventory', 'authenticateItemRequest', [[pInventoryID, pItemID]]);
				}
			}
			/**
			 * pItemType: The type to check the eligibility of
			 */
			isEligibleType(pItemType) {
				let childType = false;
				// Allows children types of a registered type to be added
				for (const rT of this._registeredTypes) {
					if (VS.Type.isType(pItemType, rT)) {
						childType = true;
						break
					}
				}
				// If this is not an registered type or a child of a registered type this cannot be added to the inventory
				if (!this._registeredTypes.includes(pItemType) && !childType) {
					console.error('aInventory: This type(' + pItemType + ') is not of a registered type with this inventory.');
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
					// If this code is ran in a multiplayer envrionment it does not need to check for `obtainable` . It will be checked server side, as its a server side variable
					if (VS.World.getCodeType() === 'local') {
						const obtainable = pItem.obtainable ? pItem.obtainable : VS.Type.getVariable(type, 'obtainable') ? VS.Type.getVariable(type, 'obtainable') : VS.Type.getStaticVariable(type, 'obtainable');
						if (!obtainable) {
							console.error('aInventory: This item(' + pItem.id + ') is not obtainable.');
							return false;
						}
					}
					if (!this.isEligibleType(pItem.type)) {
						return false;
					}
					// If this code is ran in a multiplayer envrionment it does not need to check for `quantity` . It will be checked server side, as its a server side variable
					if (VS.World.getCodeType() === 'local') {
						// Things that can be stacked have a quantity variable. If there is no quantity set then this is not a stackable item
						// If the inventory is full, and you pick up a item that is stackable, it will still check if it can be added to another stack instead of returning out.
						if (this.isMaxed() && !pItem.quantity) {
							console.error('aInventory: %cpNo available slots', 'font-weight: bold');
							return false;
						}
					}
					if (VS.Map.getDist(VS.Client.mob, pItem) > this.getMaxDistance()) {
						console.error('aInventory: This item(' + pItem.id + ') is out of range.');
						return false;
					}
				} else {
					console.error('aInventory: No item passed!');
					return false;
				}
				return true;
			}
			/**
			 * pID: The diob you want to pick up
			 * desc: If the game is ran in a multiplayer environment then the item will be autheticated by the server, this is to prevent spoofing of items
			 */
			obtain(pItem) {
				if (pItem && VS.World.getDiobByID(pItem.id)) {
					if (VS.World.getCodeType() === 'client') {
						if (this.isEligibleItem(pItem)) {
							Inventory.authenticateItemRequest(this.getID(), pItem.id);
						}
					} else {
						if (this.isEligibleItem(pItem)) {
							this.addItem(pItem);
						}
					}
				}
			}
			/**
			 * pSlotNumber: The slot to restore back into the inventory
			 * desc: This will add the slot's latest information back at this slot number
			 */
			restoreSlot(pSlotNumber) {
				if (!this.isLocked()) {
					this.getSlot(pSlotNumber).refresh();
				}
				this._activeSlotNumber = null;
			}
			/**
			 * pItemData: An object holding all information about the item being added to the inventory.
			 * pItemData.0: [ID] The id of the item you are picking up, this is so you can get the type from the id rather than sending a long type string
			 * pItemData.1: [QUANTITY] How many of this item will be added to the inventory
			 * pItemData.2: [ITEM_INFO] The item info of the diob from the server
			 * pSlotNumber: The slot this item will be going to
			 * desc: Called after the item has been verfied on the server. The server has done the heavy lifting so all this info can just be safely added without checks
			 */
			addItemFromServer(pItemData, pSlotNumber) {
				const ID = pItemData[0];
				const quantity = pItemData[1];
				const itemInfo = pItemData[2];
				let type;
				if (ID) {
					type = VS.World.getDiobByID(ID).type;
				}
				this.getSlot(pSlotNumber)._item.type = type;
				if (quantity) {
					this.getSlot(pSlotNumber)._item.quantity = quantity;
				}
				if (itemInfo) {
					this.getSlot(pSlotNumber)._item.itemInfo = itemInfo;
				}
				this.getSlot(pSlotNumber).refresh();
			}
			/**
			 * pItem: An object holding all information about the item being added to the inventory.
			 * pItem.quantity: How many of this item will be added to the inventory
			 * pItem.itemInfo: The data to store from this item
			 * desc: Add the item to the inventory, must do all checking here
			 * CLIENT-ONLY
			 */
			addItem(pItem) {
				// If this inventory is locked you cannot use it.
				if (this.isLocked()) {
					console.warn('aInventory: This inventory is currently locked. Unlock it to pick up this item');
					return;
				}
				const type = pItem.type;
				const quantity = pItem.quantity;
				const itemInfo = pItem.itemInfo ? pItem.itemInfo : VS.Type.getVariable(type, 'itemInfo') ? VS.Type.getVariable(type, 'itemInfo') : VS.Type.getStaticVariable(type, 'itemInfo');

				// Search through the slots in the inventory to see if this item already exists
				for (const slot in this._slots) {
					if (this.getSlot(slot).getItemType() === type) {
						const slotQuantity = this.getSlot(slot).getItemQuantity();
						// If this item has a quantity, it means it can be stacked
						if (quantity) {
							// Checks the instance's maxQuantity first, then the types variable, then the static variable, then if nothing is found it uses the default value
							const maxQuantity = pItem.maxQuantity ? pItem.maxQuantity : VS.Type.getVariable(type, 'maxQuantity') ? VS.Type.getVariable(type, 'maxQuantity') : VS.Type.getStaticVariable(type, 'maxQuantity') ? VS.Type.getStaticVariable(type, 'maxQuantity') : DEFAULT_MAX_QUANTITY;
							// If this slot is not full and it isn't a full stack of items being added
							if (slotQuantity !== maxQuantity) {
								if (slotQuantity + quantity > maxQuantity) {
									const leftOverQuantity = Math.max((slotQuantity + quantity) - maxQuantity, 1);
									this.getSlot(slot)._item.quantity = clamp(slotQuantity + quantity, slotQuantity, maxQuantity);
									if (itemInfo) {
										this.getSlot(slot)._item.itemInfo = itemInfo;
									}
									this.getSlot(slot).refresh();
									pItem.quantity = leftOverQuantity;
									// If you have more space in the inventory, add the remaining stack as a new item
									this.addItem(pItem);
									return;
								// If you can pick up the full amount of this item, then remove this item from this map
								} else {
									this.getSlot(slot)._item.quantity = clamp(slotQuantity + quantity, slotQuantity, maxQuantity);
									if (itemInfo) {
										this.getSlot(slot)._item.itemInfo = itemInfo;
									}
									this.getSlot(slot).refresh();
									Inventory.removeItemFromMap(pItem);
									return;
								}
							}
						}
					}
				}

				if (this.isMaxed()) {
					console.error('aInventory: %cpNo available slots', 'font-weight: bold');
					return;
				}
					
				const nearestSlot = this.getOpenSlot();
				const slotItem = { 'type': type };
				if (quantity) {
					slotItem.quantity = quantity;
				}
				if (itemInfo) {
					slotItem.itemInfo = itemInfo;
				}
				this.getSlot(nearestSlot)._item = slotItem;
				this.getSlot(nearestSlot).refresh();
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
					this.getSlot(pSlotNumber)._item.quantity = Math.max(quantity - pQuantity, 1);
				}
				this.getSlot(pSlotNumber).refresh();
			}
			/**
			 * pSlotNumber: The slot number to remove the item from
			 * pQuantity: The amount to remove from this slot
			 * desc: This will send a packet to the server to remove pQuantity amount from the item in this slot
			 * CALLABLE API
			 */
			removeQuantity(pSlotNumber, pQuantity) {
				// If this slot has a quantity to begin with
				if (this.getSlot(pSlotNumber).getItemQuantity()) {
					if (VS.World.getCodeType() === 'local') {
						this.discardQuantity(pSlotNumber, pQuantity);
					} else {
						if (typeof(VS.Client.onNetwork) === 'function') {
							VS.Client.onNetwork('aInventory', 'removeQuantity', [[this.getID(), pSlotNumber, pQuantity]]);
						}
					}
				}
			}
			/**
			 * pSlotNumber: The slot number to remove the item from
			 * pQuantity: The amount to remove from this slot
			 * desc: This will send a packet to the server to remove pQuantity amount from the item in this slot
			 */
			removeQuantityFromServer(pSlotNumber, pQuantity) {
				this.discardQuantity(pSlotNumber, pQuantity);
			}
			/**
			 * pSlotNumber: The slot number to remove the item from
			 * pQuantity: The amount to remove
			 * desc: This will drop the item inside of this slot number
			 * CALLABLE API
			 */
			removeItem(pSlotNumber, pQuantity) {
				if (this.isLocked()) {
					console.warn('aInventory: This inventory is currently locked. Unlock it to remove this item');
					return;
				}
				if (this.getSlot(pSlotNumber)) {
					if (this.getSlot(pSlotNumber).hasItem()) {
						const quantity = this.getSlot(pSlotNumber).getItemQuantity();
						// Under this condition this means that the user does not want to drop anything, the item has a stack but they inputted 0
						if (quantity & !pQuantity) return;
						// Clamp the amount to drop down to what you have available to drop to prevent duplicate item bugs
						pQuantity = clamp(pQuantity, !quantity ? ZERO : ONE, quantity);
						// This portion of the code only needs to run if the game is singleplayer. This will allow it to be added to the map.
						if (VS.World.getCodeType() === 'local') {
							const type = this.getSlot(pSlotNumber).getItemType();
							const itemInfo = this.getSlot(pSlotNumber).getItemInfo();
							const quantityToDrop = clamp(!quantity ? ZERO : pQuantity, !quantity ? ZERO : ONE, quantity);
							const dissapearOnDrop = VS.Type.getVariable(type, 'dissapearOnDrop') ? VS.Type.getVariable(type, 'dissapearOnDrop') : VS.Type.getStaticVariable(type, 'dissapearOnDrop');
							if (!dissapearOnDrop) {
								Inventory.addItemToMap(type, VS.Client.mob.xPos, VS.Client.mob.yPos, VS.Client.mob.mapName, itemInfo, quantityToDrop);
							}
							this.discardQuantity(pSlotNumber, pQuantity);
						} else {
							if (typeof(VS.Client.onNetwork) === 'function') {
								VS.Client.onNetwork('aInventory', 'removeItem', [[this.getID(), pSlotNumber, pQuantity]]);
							}
						}
					} else {
						console.error('aInventory: No item in slot(' + pSlotNumber + ')');
					}	
				} else {
					console.error('aInventory: This is not a valid slot(' + pSlotNumber + ')');
				}
			}
			/**
			 * pSlotNumber: The slot number to remove the item from
			 * pQuantity: If of value, then this item is stackable and this is the amount to remove from this item
			 * desc: Removes the item from the passed slot or removes the pQuantity amount from the item
			 */
			removeItemFromServer(pSlotNumber, pQuantity) {
				this.discardQuantity(pSlotNumber, pQuantity);
			}
			/**
			 * pSlotNumber: The slot number to remove the item from
			 * desc: Removes the item from the passed slot. Called when you drop a inventory item outside the inventory menu if disableDefaultDrop is not enabled
			 * INTERNAL API
			 */
			relinquish(pSlotNumber, pQuantity) {
				if (this.isLocked()) {
					console.warn('aInventory: This inventory is currently locked. Unlock it to remove this item');
					return;
				}
				if (this.getSlot(pSlotNumber)) {
					if (this.getSlot(pSlotNumber).hasItem()) {
						let quantityToDrop = ONE;
						const currentQuantity = this.getSlot(pSlotNumber).getItemQuantity();

						// If the item you are relinquishing has a quantity it means it is stackable and has the ability to have more than one of itself. If there is more than one of them, then you need to decide how many to relinquish.
						if (currentQuantity > ONE) {
							this.lock();
							this._activeSlotNumber = pSlotNumber;
							aInventory.input.call(this, 'Amount to drop?', function(pDropAmount) {
								const value = parseInt(pDropAmount, 10);
								quantityToDrop = clamp(Number.isInteger(value) ? value : ONE, ZERO, currentQuantity);
								if (!quantityToDrop && currentQuantity) {
									this.unlock();
									this.restoreSlot(pSlotNumber);
									return;									
								}
								if (quantityToDrop >= ONE) {
									this.unlock();
									// If you remove this amount of items from the stack and there is still some left, then restore this item to the inventory
									if ((currentQuantity - quantityToDrop) > ZERO) {
										this.restoreSlot(pSlotNumber);
									}
									this.removeItem(pSlotNumber, quantityToDrop);
								} else {
									this.unlock();
									this.restoreSlot(pSlotNumber);
								}
							}.bind(this));
						} else {
							this.removeItem(pSlotNumber, currentQuantity);
						}
					} else {
						console.error('aInventory: No item in slot(' + pSlotNumber + ')');
					}	
				} else {
					console.error('aInventory: This is not a valid slot(' + pSlotNumber + ')');
				}
			}
			/**
			 * pSlotInstance1: SlotIntance that references the slot you are holding
			 * pSlotInstance2: SlotIntance that references the slot you are moving to
			 * desc: Moves a slot to an empty slot
			 */
			moveSlot(pSlotInstance1, pSlotInstance2) {
				if (!this.isLocked()) {
					// We get the inventory of this new slot, since dragging to a different is a valid action
					const inventory = pSlotInstance2.getParent();
					if (inventory.isEligibleType(pSlotInstance1.getItemType())) {
						const slot1InstanceData = pSlotInstance1.getItem();

						pSlotInstance1.wipe();
						pSlotInstance2._item = slot1InstanceData;

						pSlotInstance1.refresh();
						pSlotInstance2.refresh();

						if (typeof(VS.Client.onNetwork) === 'function') {
							VS.Client.onNetwork('aInventory', 'moveSlot', [[this.getID(), inventory.getID(), pSlotInstance1.getSlotNumber(), pSlotInstance2.getSlotNumber()]]);
						}
					} else {
						this.restoreSlot(pSlotInstance1.getSlotNumber());
					}
				}
			}
			/**
			 * pSlotInstance1: SlotIntance that references the slot you are holding
			 * pSlotInstance2: SlotIntance that references the slot you are moving to and attempting a swap with
			 * desc: Swaps the items in the inventory
			 */
			swapSlots(pSlotInstance1, pSlotInstance2) {
				if (!this.isLocked()) {
					// We get the inventory of this new slot, since dragging to a different is a valid action
					const inventory = pSlotInstance2.getParent();
					// Inventory most times will be a reference to this interface itself, if a user is swapping items between the same inventory
					// It also has a the ability to be another inventory as well though, due to the ability to move items to a fro another inventory entirely
					// We check if the item inside of pSlotInstance2 is a valid type for this inventory
					// We check if the item inside of pSlotInstance1 is a valid type for the new inventory
					if (this.isEligibleType(pSlotInstance2.getItemType()) && inventory.isEligibleType(pSlotInstance1.getItemType())) {
						const slot1InstanceData = pSlotInstance1.getItem();
						const slot2InstanceData = pSlotInstance2.getItem();

						pSlotInstance1._item = slot2InstanceData;
						pSlotInstance2._item = slot1InstanceData;

						pSlotInstance1.refresh();
						pSlotInstance2.refresh();

						if (typeof(VS.Client.onNetwork) === 'function') {
							VS.Client.onNetwork('aInventory', 'swapSlots', [[this.getID(), inventory.getID(), pSlotInstance1.getSlotNumber(), pSlotInstance2.getSlotNumber()]])
						}
					} else {
						this.restoreSlot(pSlotInstance1.getSlotNumber());
						inventory.restoreSlot(pSlotInstance2.getSlotNumber());
					}
				}
			}
		}
		/**
		 * desc: Create a inventory from the server side
		 */
		aInventory.createInventoryFromServer = function(pInterface, pItemAtlasName, pSlotType, pGlobal, pMaxSlots, pMaxDistance, pSlotClassList, pRegisteredTypes, pDenotar, pID, pVariable, pDisableDefaultDrop) {
			const settings = {
				'interface': pInterface,
				'itemAtlasName': pItemAtlasName,
				'slotType': pSlotType,
				'global': pGlobal,
				'maxSlots': pMaxSlots,
				'maxDistance': pMaxDistance,
				'slotClassList': pSlotClassList,
				'registeredTypes': pRegisteredTypes,
				'denotar': pDenotar,
				'disableDefaultDrop': pDisableDefaultDrop,
				'id': pID
			}
			VS.Client[pVariable] = this.createInventory(settings);

		}
		/**
		 * pTitle: The title to use for the input modal
		 * pCallback: The callback to use for the modal when the quantity is used
		 * desc: An input menu that is shown so a user can input a qunatity
		 */
		aInventory.input = function(pTitle = 'Drop how many?', pCallback) {
			const modal = document.getElementById('aInventory_modal');
			const modalInput = document.getElementById('aInventory_modalInput');
			const modalCloseButton = document.getElementById('aInventory_modalClose');
			const modalSubmitButton = document.getElementById('aInventory_submit');
			const modalTitle = document.getElementById('aInventory_modalTitleContent');

			if (!modal.initialized) {
				modal.show = function() {
					this.style.display = 'block';
				}
				modal.hide = function() {
					this.style.display = 'none';
					this.inventory.unlock();
					this.inventory.restoreSlot(this.inventory._activeSlotNumber);
					this.inventory = null;
					modalInput.value = 1;
				}
				modal.close = function() {
					if (typeof(this.callback) === 'function') {
						this.callback(parseInt(modalInput.value, 10));
					}
					this.callback = null;
					modalInput.value = 1;
				}
				modalSubmitButton.addEventListener('click', function(pEvent) {
					modal.close();
					modal.style.display = 'none';
				});
				modalCloseButton.addEventListener('click', function(pEvent) {
					modal.hide();
				});
				window.addEventListener('click', function(pEvent) {
					if (pEvent.target === modal) {
						modal.hide();
					}
				});
				modal.initialized = true;
			}
	
			modalTitle.textContent = pTitle;
			modal.callback = pCallback;
			modal.inventory = this;
			modalInput.setAttribute('max', modal.inventory._slots[modal.inventory._activeSlotNumber].getItemQuantity());
			modal.show();
		}
		/**
		 * pSettings: Object holding the settings for this inventory
		 * pSettings.interface: The interface the will be used for this inventory
		 * pSettings.itemAtlasName: The atlas file where this inventory can reference where to find icons for it's items it picks up
		 * pSettings.global: If this inventory can move items from its slots to another inventory's slot. (Needs to adhere to the registeredTypes still)
		 * pSettings.maxSlots: The max amount of slots this inventory uses. This is used to check if its full or not
		 * pSettings.maxDistance: The max amount of distance that can be between the the player and item being picked up
		 * pSettings.slotType: The slot type to be used
		 * pSettings.slotClassList: The classes that will be assigned to the slot element when it has a quantity to show.
		 * pSettings.registeredTypes: The allowed types that this inventory can store in an array. If the type is not registered the inventory will not allow it to be stored.
		 * pSettings.denotar: The suffix this inventory will append to the items's iconName that it picks up. This will be used to find the appropriate icon per item stored. The default is "_gui"
		 * pSettings.disableDefaultDrop: If this inventory will prevent the default action for dropping items. This means the user will drop things themselves.
		 * pSettings.id: The id to reference this inventory with. This will only be passed from the server
		 */
		aInventory.createInventory = function(pSettings) {
			if (typeof(pSettings) === 'object' && pSettings.constructor === Object) {
				if (!pSettings.interface) {
					console.error('aInventory: The pSettings.interface string could not be found. Initialization failed.');
					return;					
				} else if (!VS.Client.getInterfaceNames().includes(pSettings.interface)) {
					console.error('aInventory: The pSettings.interface interface could not be found. Initialization failed.');
					return;
				}
				if (!pSettings.itemAtlasName) {
					console.error('aInventory: The pSettings.itemAtlasName string could not be found. Initialization failed.');
					return;					
				}
				if (typeof(pSettings.slotType) !== 'string') {
					console.error('aInventory: The pSettings.slotType is of the wrong type. Expecting a string. Initialization failed.');
					return;
				}
				if (!pSettings.slotType) {
					console.error('aInventory: pSettings.slotType was found! This is a needed property');
					return;
				}

				if (pSettings.global) pSettings.global = true;
				if (pSettings.disableDefaultDrop) pSettings.disableDefaultDrop = true;
				if (!pSettings.denotar) pSettings.denotar = DEFAULT_DENOTAR;
				pSettings.maxSlots = typeof(pSettings.maxSlots) !== 'number' ? DEFAULT_MAX_SLOTS : Math.round(pSettings.maxSlots);
				pSettings.maxDistance = typeof(pSettings.maxDistance) !== 'number' ? DEFAULT_MAX_DISTANCE : Math.round(pSettings.maxDistance);
				
				if (!Array.isArray(pSettings.slotClassList)) {
					pSettings.slotClassList = [];
					console.error('aInventory: The pSettings.slotClassList is not of the Array type.');
				}
				if (!Array.isArray(pSettings.registeredTypes)) {
					pSettings.registeredTypes = [];
					console.warn('aInventory: This inventory has no registered types to accept. It will not be able to store anything until a type is registered!');
				}
				const inventory = new Inventory(pSettings);
				// Store the slot type so we can reference it in mouse events to see if a slot was used in a mouse event
				this.storedSlotTypes[pSettings.slotType] = inventory;
				
				if (pSettings.id) {
					this.storedInventories[pSettings.id] = inventory;
				}
				
				const slotWidth = VS.Type.getVariable(pSettings.slotType, 'width');
				const slotHeight = VS.Type.getVariable(pSettings.slotType, 'height');

				this.slotHighlight = VS.newDiob('Overlay');
				this.slotHighlight.width = slotWidth;
				this.slotHighlight.height = slotHeight;
				this.slotHighlight.preventAutoScale = true;
				this.slotHighlight.mouseOpacity = 0;
				this.slotHighlight.touchOpacity = 0;
				this.slotHighlight.atlasName = '';
				this.slotHighlight.iconName = '';
				this.slotHighlight.alpha = 0.1;
				this.slotHighlight.color = { 'tint': 0xFFFFFF };
				return inventory;
			} else {
				console.warn('aInventory: Invalid type passed for pSettings');
			}
		}

		aInventory.handleOnMouseDown = function(pDiob, pX, pY, pButton) {
			if (pButton === 1) {
				const inventory = this.storedSlotTypes[pDiob.type];
				if (pDiob && inventory) {
					if (!inventory.isLocked()) {
						const slotInstance = pDiob.slotInstance;
						if (slotInstance.hasItem()) {
							this.heldSlotInstance = slotInstance;
							this.grabbing  = true;
							if (!this.mouseCursor) {
								this.mouseCursor = VS.newDiob();
							}
							this.mouseCursor.atlasName = VS.Type.getVariable(slotInstance.getItemType(), 'atlasName');
							this.mouseCursor.iconName = VS.Type.getVariable(slotInstance.getItemType(), 'iconName');
							this.mouseCursor.iconState = VS.Type.getVariable(slotInstance.getItemType(), 'iconState');
							VS.Client.setMouseCursor(this.mouseCursor);
							slotInstance.hideInfo();
						}
					}
				}
			}			
		}

		aInventory.handleOnMouseUp = function(pDiob, pX, pY, pButton) {
			if (pButton === 1) {
				if (this.heldSlotInstance) {
					const inventory = this.heldSlotInstance.getParent();
					let newInventory;
					let newSlotInstance;
					if (pDiob) {
						newInventory = this.storedSlotTypes[pDiob.type];
						newSlotInstance = pDiob.slotInstance;
						if (pDiob.mapName && pDiob.baseType !== 'Interface') {
							if (!inventory.dropIsDisabled()) {
								// If this diob is a map diob, drop it onto the map
								inventory.relinquish(this.heldSlotInstance.getSlotNumber());
							}
						} else if (this.heldSlotInstance === newSlotInstance) {
							inventory.restoreSlot(this.heldSlotInstance.getSlotNumber());
						} else if (newSlotInstance && inventory === newInventory) {
							// If this item is being moved to another slot in the same inventory
							if (newSlotInstance.hasItem()) {
								// Slot instance has something in it
								inventory.swapSlots(this.heldSlotInstance, newSlotInstance);
							} else {
								// Slot instance is empty
								inventory.moveSlot(this.heldSlotInstance, newSlotInstance)
							}		
						} else if (newSlotInstance && inventory !== newInventory) {
							// If this item is being moved to another slot in a different inventory
							// The new inventory has to be global to accept things from another inventory
							if (newInventory.isGlobal()) {
								if (newSlotInstance.hasItem()) {
									// If you try to swap slots with the new inventory, then the current inventory needs to be global to accept the item coming from the new inventory
									if (inventory.isGlobal()) {
										// Slot instance has something in it
										inventory.swapSlots(this.heldSlotInstance, newSlotInstance);
									} else {
										inventory.restoreSlot(this.heldSlotInstance.getSlotNumber());
									}
								} else {
									// Slot instance is empty
									inventory.moveSlot(this.heldSlotInstance, newSlotInstance)
								}
							} else {
								inventory.restoreSlot(this.heldSlotInstance.getSlotNumber());
							}
						} else if (pDiob.baseType === 'Interface') {
							// If you are holding onto a slot and you have moved it over a interface diob then restore this slot since it's not a valid dropping location
							inventory.restoreSlot(this.heldSlotInstance.getSlotNumber());
						}
					} else {
						if (!inventory.dropIsDisabled()) {
							// If you are holding onto a slot and there is no diob at all (it must be a tile since they have no mouseOpacity by default or a map void)
							inventory.relinquish(this.heldSlotInstance.getSlotNumber());
						}
					}
					this.heldSlotInstance.refresh();
					this.heldSlotInstance = null;
					if (newSlotInstance) newSlotInstance.refresh();
					this.grabbing = false;
					VS.Client.setMouseCursor('');
				}
			}
		}

		aInventory.getInventoryByID = function(pInventoryID) {
			return this.storedInventories[pInventoryID];
		}

		aInventory.isHoldingItem = function() {
			return this.grabbing ? true : false;
		}

		aInventory.toggleDebug = function() {
			this.debugging = !this.debugging;
		}

		AListener.addEventListener(VS.Client, 'onMouseDown', aInventory.handleOnMouseDown.bind(aInventory));
		AListener.addEventListener(VS.Client, 'onMouseUp', aInventory.handleOnMouseUp.bind(aInventory));
	}
})();
