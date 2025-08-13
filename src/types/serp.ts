export interface SERPResult {
  type: string;
  rank_group: number;
  rank_absolute: number;
  position: string;
  xpath: string;
  domain: string;
  title: string;
  url: string;
  breadcrumb?: string;
  website_name?: string;
  snippet?: string;
  highlighted?: string[];
  extra?: {
    ad_aclk?: string;
    number_of_ads?: number;
    text_before?: string;
    text_after?: string;
  };
  about_this_result?: {
    type: string;
    url: string;
    source: string;
    source_info: string;
    source_url: string;
    language: string;
    location: string;
    search_terms: string[];
  };
  related_result?: any[];
  timestamp?: string;
  rectangle?: any;
}

export interface DataForSEOResponse {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    time: string;
    cost: number;
    result_count: number;
    path: string[];
    data: {
      api: string;
      function: string;
      se: string;
      se_type: string;
      language_code: string;
      location_code: number;
      keyword: string;
      device: string;
      os: string;
    };
    result: Array<{
      keyword: string;
      type: string;
      se_domain: string;
      location_code: number;
      language_code: string;
      check_url: string;
      datetime: string;
      spell: any;
      refinement_chips: any;
      item_types: string[];
      se_results_count: number;
      items_count: number;
      items: SERPResult[];
    }>;
  }>;
}

export interface CompetitorSelection {
  url: string;
  title: string;
  domain: string;
  snippet: string;
  position: number;
  selected: boolean;
}