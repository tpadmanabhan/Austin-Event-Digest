import { renderToString } from "react-dom/server";
import { PublicDocumentView } from "../src/components/public-document-view";
import type { PublicDocumentModel } from "../src/lib/public-document";
import { DEAL_LOCATIONS } from "../src/data/curated-cares-locations";

export function enrichModel(model: PublicDocumentModel): PublicDocumentModel {
  if (model.kind !== "deals") return model;
  return { ...model, events: [
    ...DEAL_LOCATIONS.map((deal, index) => ({
      id: `curated-offer-${index}`, title: deal.name, description: deal.deal, date: "Recurring offer",
      venue: deal.name, category: "Local offer", isPost: true,
    })), ...model.events,
  ] };
}

export function render(model: PublicDocumentModel) {
  return renderToString(<PublicDocumentView model={model} />);
}
