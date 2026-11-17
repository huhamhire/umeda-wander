/** Planned locales share semantic message IDs; only Chinese is maintained today. */
export type Locale = 'zh-CN' | 'ja' | 'en';

export type MessageParameters = Readonly<Record<string, string | number>>;
export type MessageCatalog = Readonly<Record<string, string>>;
