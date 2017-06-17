// https://github.com/edcarroll/ta-json
import {
    JsonElementType,
    JsonObject,
    JsonProperty,
    OnDeserialized,
} from "ta-json";

import { OPDSFacet } from "./opds2-facet";
import { OPDSGroup } from "./opds2-group";
import { OPDSLink } from "./opds2-link";
import { OPDSMetadata } from "./opds2-metadata";
import { OPDSPublication } from "./opds2-publication";

@JsonObject()
export class OPDSFeed {

    @JsonProperty("@context")
    @JsonElementType(String)
    public Context: string[];

    @JsonProperty("metadata")
    public Metadata: OPDSMetadata;

    @JsonProperty("links")
    @JsonElementType(OPDSLink)
    public Links: OPDSLink[];

    @JsonProperty("publications")
    @JsonElementType(OPDSPublication)
    public Publications: OPDSPublication[];

    @JsonProperty("navigation")
    @JsonElementType(OPDSLink)
    public Navigation: OPDSLink[];

    @JsonProperty("facets")
    @JsonElementType(OPDSFacet)
    public Facets: OPDSFacet[];

    @JsonProperty("groups")
    @JsonElementType(OPDSGroup)
    public Groups: OPDSGroup[];

    public AddFacet(link: OPDSLink, group: string) {

        if (this.Facets) {
            const found = this.Facets.find((f) => {
                if (f.Metadata && f.Metadata.Title === group) {
                    if (!f.Links) {
                        f.Links = [];
                    }
                    f.Links.push(link);
                    return true;
                }
                return false;
            });
            if (found) {
                return;
            }
        }

        const facet = new OPDSFacet();

        facet.Metadata = new OPDSMetadata();
        facet.Metadata.Title = group;

        facet.Links = [];
        facet.Links.push(link);

        if (!this.Facets) {
            this.Facets = [];
        }
        this.Facets.push(facet);
    }

    public AddPublicationInGroup(publication: OPDSPublication, collLink: OPDSLink) {

        if (this.Groups) {
            const found1 = this.Groups.find((g) => {
                if (g.Links) {
                    const found2 = g.Links.find((l) => {

                        if (l.Href === collLink.Href) {
                            if (!g.Publications) {
                                g.Publications = [];
                            }
                            g.Publications.push(publication);
                            return true;
                        }
                        return false;
                    });
                    if (found2) {
                        return true;
                    }
                }
                return false;
            });

            if (found1) {
                return;
            }
        }

        const group = new OPDSGroup();
        group.Metadata = new OPDSMetadata();
        group.Metadata.Title = collLink.Title;

        group.Publications = [];
        group.Publications.push(publication);

        const linkSelf = new OPDSLink();
        linkSelf.Rel = ["self"];
        linkSelf.Title = collLink.Title;
        linkSelf.Href = collLink.Href;

        group.Links = [];
        group.Links.push(linkSelf);

        if (!this.Groups) {
            this.Groups = [];
        }
        this.Groups.push(group);
    }

    public AddNavigationInGroup(link: OPDSLink, collLink: OPDSLink) {

        if (this.Groups) {
            const found1 = this.Groups.find((g) => {
                if (g.Links) {
                    const found2 = g.Links.find((l) => {

                        if (l.Href === collLink.Href) {
                            if (!g.Navigation) {
                                g.Navigation = [];
                            }
                            g.Navigation.push(link);
                            return true;
                        }
                        return false;
                    });
                    if (found2) {
                        return true;
                    }
                }
                return false;
            });

            if (found1) {
                return;
            }
        }

        const group = new OPDSGroup();
        group.Metadata = new OPDSMetadata();
        group.Metadata.Title = collLink.Title;

        group.Navigation = [];
        group.Navigation.push(link);

        const linkSelf = new OPDSLink();
        linkSelf.Rel = ["self"];
        linkSelf.Title = collLink.Title;
        linkSelf.Href = collLink.Href;

        group.Links = [];
        group.Links.push(link);

        if (!this.Groups) {
            this.Groups = [];
        }
        this.Groups.push(group);
    }

    @OnDeserialized()
    // tslint:disable-next-line:no-unused-variable
    private _OnDeserialized() {
        if (!this.Metadata) {
            console.log("OPDS2Feed.Metadata is not set!");
        }
        if (!this.Links) {
            console.log("OPDS2Feed.Links is not set!");
        }
    }
}
