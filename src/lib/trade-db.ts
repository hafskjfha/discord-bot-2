import db from "@/db/index.js";

// ─── 테이블 생성 ───
db.exec(`
    CREATE TABLE IF NOT EXISTS marketplace_listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        seller_id TEXT NOT NULL,
        seller_name TEXT NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        description TEXT,
        price INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        channel_id TEXT,
        message_id TEXT,
        thread_id TEXT,
        buyer_id TEXT,
        buyer_name TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS marketplace_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        listing_id INTEGER,
        item_name TEXT NOT NULL,
        seller_id TEXT NOT NULL,
        seller_name TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        buyer_name TEXT NOT NULL,
        price INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        completed_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS exchange_listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        offerer_id TEXT NOT NULL,
        offerer_name TEXT NOT NULL,
        offer_item TEXT NOT NULL,
        offer_quantity INTEGER NOT NULL DEFAULT 1,
        want_item TEXT NOT NULL,
        want_quantity INTEGER NOT NULL DEFAULT 1,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        channel_id TEXT,
        message_id TEXT,
        thread_id TEXT,
        responder_id TEXT,
        responder_name TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
`);

// ─── 거래소 (Marketplace) ───

export interface MarketplaceListing {
    id: number;
    guild_id: string;
    seller_id: string;
    seller_name: string;
    item_name: string;
    quantity: number;
    description: string | null;
    price: number;
    status: string;
    channel_id: string | null;
    message_id: string | null;
    thread_id: string | null;
    buyer_id: string | null;
    buyer_name: string | null;
    created_at: number;
}

export interface MarketplaceTransaction {
    id: number;
    guild_id: string;
    listing_id: number | null;
    item_name: string;
    seller_id: string;
    seller_name: string;
    buyer_id: string;
    buyer_name: string;
    price: number;
    quantity: number;
    completed_at: number;
}

export interface ExchangeListing {
    id: number;
    guild_id: string;
    offerer_id: string;
    offerer_name: string;
    offer_item: string;
    offer_quantity: number;
    want_item: string;
    want_quantity: number;
    description: string | null;
    status: string;
    channel_id: string | null;
    message_id: string | null;
    thread_id: string | null;
    responder_id: string | null;
    responder_name: string | null;
    created_at: number;
}

// ─── Marketplace Queries ───

const insertMarketplaceListing = db.prepare(`
    INSERT INTO marketplace_listings (guild_id, seller_id, seller_name, item_name, quantity, description, price, channel_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const getMarketplaceListingById = db.prepare(`
    SELECT * FROM marketplace_listings WHERE id = ?
`);

const getActiveMarketplaceListings = db.prepare(`
    SELECT * FROM marketplace_listings WHERE guild_id = ? AND status = 'active' ORDER BY created_at DESC
`);

const updateMarketplaceListingMessage = db.prepare(`
    UPDATE marketplace_listings SET message_id = ? WHERE id = ?
`);

const updateMarketplaceListingThread = db.prepare(`
    UPDATE marketplace_listings SET thread_id = ?, buyer_id = ?, buyer_name = ? WHERE id = ?
`);

const updateMarketplaceListingStatus = db.prepare(`
    UPDATE marketplace_listings SET status = ? WHERE id = ?
`);

const insertMarketplaceTransaction = db.prepare(`
    INSERT INTO marketplace_transactions (guild_id, listing_id, item_name, seller_id, seller_name, buyer_id, buyer_name, price, quantity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getItemTransactions = db.prepare(`
    SELECT * FROM marketplace_transactions WHERE guild_id = ? AND item_name = ? ORDER BY completed_at DESC LIMIT 10
`);

const getItemAvgPrice = db.prepare(`
    SELECT AVG(price) as avg_price, COUNT(*) as count FROM marketplace_transactions WHERE guild_id = ? AND item_name = ?
`);

// ─── Exchange Queries ───

const insertExchangeListing = db.prepare(`
    INSERT INTO exchange_listings (guild_id, offerer_id, offerer_name, offer_item, offer_quantity, want_item, want_quantity, description, channel_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getExchangeListingById = db.prepare(`
    SELECT * FROM exchange_listings WHERE id = ?
`);

const getActiveExchangeListings = db.prepare(`
    SELECT * FROM exchange_listings WHERE guild_id = ? AND status = 'active' ORDER BY created_at DESC
`);

const updateExchangeListingMessage = db.prepare(`
    UPDATE exchange_listings SET message_id = ? WHERE id = ?
`);

const updateExchangeListingThread = db.prepare(`
    UPDATE exchange_listings SET thread_id = ?, responder_id = ?, responder_name = ? WHERE id = ?
`);

const updateExchangeListingStatus = db.prepare(`
    UPDATE exchange_listings SET status = ? WHERE id = ?
`);

// ─── Exported DB Functions ───

export function createMarketplaceListing(
    guildId: string,
    sellerId: string,
    sellerName: string,
    itemName: string,
    quantity: number,
    description: string | null,
    price: number,
    channelId: string,
): number {
    const result = insertMarketplaceListing.run(guildId, sellerId, sellerName, itemName, quantity, description, price, channelId);
    return result.lastInsertRowid as number;
}

export function getMarketListing(id: number): MarketplaceListing | undefined {
    return getMarketplaceListingById.get(id) as MarketplaceListing | undefined;
}

export function getActiveMarketListings(guildId: string): MarketplaceListing[] {
    return getActiveMarketplaceListings.all(guildId) as MarketplaceListing[];
}

export function setMarketListingMessage(id: number, messageId: string): void {
    updateMarketplaceListingMessage.run(messageId, id);
}

export function setMarketListingThread(id: number, threadId: string, buyerId: string, buyerName: string): void {
    updateMarketplaceListingThread.run(threadId, buyerId, buyerName, id);
}

export function setMarketListingStatus(id: number, status: string): void {
    updateMarketplaceListingStatus.run(status, id);
}

export function completeMarketTransaction(listing: MarketplaceListing, buyerId: string, buyerName: string): void {
    const completeTransaction = db.transaction(() => {
        updateMarketplaceListingStatus.run("sold", listing.id);
        insertMarketplaceTransaction.run(
            listing.guild_id,
            listing.id,
            listing.item_name,
            listing.seller_id,
            listing.seller_name,
            buyerId,
            buyerName,
            listing.price,
            listing.quantity,
        );
    });
    completeTransaction();
}

export function getTransactionHistory(guildId: string, itemName: string): MarketplaceTransaction[] {
    return getItemTransactions.all(guildId, itemName) as MarketplaceTransaction[];
}

export function getItemPriceStats(guildId: string, itemName: string): { avg_price: number | null; count: number } {
    return getItemAvgPrice.get(guildId, itemName) as { avg_price: number | null; count: number };
}

// ─── Exchange DB Functions ───

export function createExchangeListing(
    guildId: string,
    offererId: string,
    offererName: string,
    offerItem: string,
    offerQuantity: number,
    wantItem: string,
    wantQuantity: number,
    description: string | null,
    channelId: string,
): number {
    const result = insertExchangeListing.run(guildId, offererId, offererName, offerItem, offerQuantity, wantItem, wantQuantity, description, channelId);
    return result.lastInsertRowid as number;
}

export function getExchangeListing(id: number): ExchangeListing | undefined {
    return getExchangeListingById.get(id) as ExchangeListing | undefined;
}

export function getActiveExchanges(guildId: string): ExchangeListing[] {
    return getActiveExchangeListings.all(guildId) as ExchangeListing[];
}

export function setExchangeListingMessage(id: number, messageId: string): void {
    updateExchangeListingMessage.run(messageId, id);
}

export function setExchangeListingThread(id: number, threadId: string, responderId: string, responderName: string): void {
    updateExchangeListingThread.run(threadId, responderId, responderName, id);
}

export function setExchangeListingStatus(id: number, status: string): void {
    updateExchangeListingStatus.run(status, id);
}

export function completeExchangeTransaction(id: number): void {
    updateExchangeListingStatus.run("completed", id);
}
