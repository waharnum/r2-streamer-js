import {
    XmlObject,
    XmlXPathSelector,
} from "../../xml-js-mapper";

@XmlObject({
    app: "http://www.w3.org/2007/app",
    atom: "http://www.w3.org/2005/Atom",
    bibframe: "http://bibframe.org/vocab/",
    dcterms: "http://purl.org/dc/terms/",
    odl: "http://opds-spec.org/odl",
    opds: "http://opds-spec.org/2010/catalog",
    opensearch: "http://a9.com/-/spec/opensearch/1.1/",
    schema: "http://schema.org",
    thr: "http://purl.org/syndication/thread/1.0",
    xsi: "http://www.w3.org/2001/XMLSchema-instance",
})
export class Link {

    @XmlXPathSelector("opds:price/text()")
    public OpdsPrice: string;

    @XmlXPathSelector("opds:price/@currencycode")
    public OpdsPriceCurrencyCode: string;

    @XmlXPathSelector("opds:indirectAcquisition/@type")
    public OpdsIndirectAcquisitionType: string;

    @XmlXPathSelector("opds:indirectAcquisition/opds:indirectAcquisition/@type")
    public OpdsIndirectAcquisitionType_: string;

    @XmlXPathSelector("@type")
    public Type: string;

    // and .='hqdefault'
    // @XmlXPathSelector("@*[local-name()='count' and namespace-uri()='http://purl.org/syndication/thread/1.0']")
    @XmlXPathSelector("@thr:count")
    public ThrCount: string;

    @XmlXPathSelector("@opds:facetGroup")
    public FacetGroup: string;

    @XmlXPathSelector("@href")
    public Href: string;

    @XmlXPathSelector("@rel")
    public Rel: string;

    @XmlXPathSelector("@title")
    public Title: string;
}