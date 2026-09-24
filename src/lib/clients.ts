export const CLIENTS = ["CBO", "DOF"] as const;
export const REPORT_REQUIRED_CLIENT = "CBO";

export function cboVesselsIn(vessels: string[], vesselClients: Record<string, string>) {
  return vessels.filter((vessel) => vesselClients[vessel] === REPORT_REQUIRED_CLIENT);
}
