export interface TemplatePage {
  ref?: string;
  title?: string;
  icon?: string;
  blocks?: TemplateBlock[];
  databases?: TemplateDb[];
  children?: TemplatePage[];
}

export interface TemplateBlock {
  type: string;
  text?: string;
  checked?: boolean;
  lang?: string;
  icon?: string;
  url?: string;
  caption?: string;
  databaseRef?: string;
  children?: TemplateBlock[];
}

export interface TemplateDb {
  ref?: string;
  name?: string;
  icon?: string;
  properties?: { id?: string; name: string; type: string }[];
  seedRows?: Record<string, unknown>[];
}
