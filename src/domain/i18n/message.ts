/** Supported page and map locales share semantic message IDs. */
export type Locale = 'zh-CN' | 'ja' | 'en';

export type MessageParameters = Readonly<Record<string, string | number>>;
export type MessageCatalog = Readonly<Record<string, string>>;
