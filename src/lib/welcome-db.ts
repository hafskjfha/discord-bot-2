import db from '@/db/index.js';

// 테이블 생성
db.exec(`
    CREATE TABLE IF NOT EXISTS welcome_settings (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL
    );
`);

/**
 * 환영 메시지 채널 설정
 * @param guildId 길드 ID
 * @param channelId 채널 ID
 */
export function setWelcomeChannel(guildId: string, channelId: string) {
    const stmt = db.prepare(`
        INSERT INTO welcome_settings (guild_id, channel_id)
        VALUES (?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id
    `);
    stmt.run(guildId, channelId);
}

/**
 * 환영 메시지 채널 조회
 * @param guildId 길드 ID
 * @returns 설정된 채널 ID 또는 undefined
 */
export function getWelcomeChannel(guildId: string): string | undefined {
    const stmt = db.prepare('SELECT channel_id FROM welcome_settings WHERE guild_id = ?');
    const result = stmt.get(guildId) as { channel_id: string } | undefined;
    return result?.channel_id;
}
