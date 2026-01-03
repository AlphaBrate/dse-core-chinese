export const db = {
	name: "AlphaBrateDB",
	version: 1,
	storeName: "sessions",

	async open(): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.name, this.version);
			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(this.storeName)) {
					db.createObjectStore(this.storeName);
				}
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	},

	async set(key: string, value: any): Promise<void> {
		const database = await this.open();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction(
				this.storeName,
				"readwrite"
			);
			const store = transaction.objectStore(this.storeName);
			const request = store.put(value, key);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	},

	async get(key: string): Promise<any> {
		const database = await this.open();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction(
				this.storeName,
				"readonly"
			);
			const store = transaction.objectStore(this.storeName);
			const request = store.get(key);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	},
};
