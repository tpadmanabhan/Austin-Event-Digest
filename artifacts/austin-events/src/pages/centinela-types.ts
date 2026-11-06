import type {
  CentinelaActivity,
  CentinelaLocalEvent,
  CentinelaUpdate,
} from "@workspace/api-client-react";

export interface CentinelaOfficialLinks {
  community?: string;
  hoa?: string;
  services?: string;
  vendors?: string;
}

export type { CentinelaActivity, CentinelaLocalEvent, CentinelaUpdate };
