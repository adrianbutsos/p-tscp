export type Campaign = {
  id: string;
  name: string;
  description: string;
  priority: string;
  target_share: number;
  enabled: boolean;
  notes?: string | null;
};

export type Audience = {
  id: string;
  name: string;
  description: string;
  priority: string;
  relevant_campaigns: string[];
  preferred_platforms: string[];
  content_angles: string[];
  enabled: boolean;
};

export type Source = {
  id: string;
  name: string;
  source_type: "Official" | "Community" | "Secondary";
  organization_account: string | null;
  platforms: string[];
  url: string | null;
  search_queries: string[];
  enabled: boolean;
  verification_status: string;
  notes: string | null;
};
