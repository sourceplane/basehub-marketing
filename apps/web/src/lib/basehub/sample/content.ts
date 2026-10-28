// The sample content: what the site shows before a BaseHub repository is
// connected. It is shaped like the repository the template expects — the
// same types and fields its queries ask for (basehub-types.d.ts) — and every
// word and image here was written for this site's first deploy: the
// template's own demo content lives in BaseHub, under BaseHub's terms, and is
// not copied.
//
// Once BASEHUB_TOKEN is set the site reads the owner's repository and none of
// this is used. To start that repository, BaseHub's "Use template" (README,
// "Connecting BaseHub") creates one with the template's full demo.
import { SITE_NAME, SOURCE_URL } from "@/lib/site";
import { SAMPLE_INGEST_KEY, SAMPLE_SEARCH_KEY } from "../connection";

const BLUR = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function image(url: string, width: number, height: number, alt: string | null = null) {
  return {
    __typename: "BlockImage",
    url,
    rawUrl: url,
    alt,
    width,
    height,
    aspectRatio: `${width}/${height}`,
    blurDataURL: BLUR,
    placeholderURL: BLUR,
    mimeType: "image/svg+xml",
    fileName: url.split("/").pop(),
  };
}

function darkLight(name: string, width: number, height: number, alt: string) {
  return {
    __typename: "DarkLightImageComponent",
    dark: image(`/sample/${name}-dark.svg`, width, height, alt),
    light: image(`/sample/${name}-light.svg`, width, height, alt),
  };
}

let ids = 0;
function base(typename: string, title: string) {
  ids += 1;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return {
    __typename: typename,
    _id: `sample-${ids}`,
    _title: title,
    _slug: slug,
    _analyticsKey: `sample-${ids}`,
    _sys: { slug, id: `sample-${ids}`, __typename: "BlockDocumentSys" },
  };
}

function text(value: string) {
  return { type: "text", text: value };
}
function paragraph(...parts: string[]) {
  return { type: "paragraph", content: parts.map(text) };
}
function heading(level: number, value: string) {
  return { type: "heading", attrs: { level }, content: [text(value)] };
}
function bullets(...items: string[]) {
  return {
    type: "bulletList",
    content: items.map((item) => ({ type: "listItem", content: [paragraph(item)] })),
  };
}
function richText(...content: unknown[]) {
  return { json: { content, toc: [], blocks: [] } };
}

function button(label: string, href: string, type: "primary" | "secondary" | "tertiary") {
  return { ...base("ButtonComponent", label), label, href, type, icon: null };
}

function headingComponent(title: string, subtitle: string | null, tag: string | null, align: "center" | "left" = "center") {
  return { ...base("HeadingComponent", title), title, subtitle, tag, align };
}

// ── People and companies ────────────────────────────────────────────────────

const companies = ["Northwind", "Lumen Labs", "Ferrous", "Halcyon", "Brightline"].map((name, i) => ({
  ...base("CompanyComponent", name),
  url: null,
  image: image(`/sample/company-${i + 1}.svg`, 140, 40, name),
}));

const people = [
  { name: "Ada Okafor", role: "Head of Growth" },
  { name: "Mateo Lindqvist", role: "Founder" },
  { name: "Priya Raman", role: "Product Lead" },
  { name: "Jonas Weber", role: "Engineering Manager" },
].map((p, i) => ({
  ...base("AuthorComponent", p.name),
  role: p.role,
  x: null,
  image: image(`/sample/avatar-${i + 1}.svg`, 100, 100, p.name),
  company: companies[i],
}));

const quotes = [
  "We replaced three tools with one page we can actually edit ourselves. Launch day went from a project to an afternoon.",
  "Every section is a block our marketing team can rearrange without asking engineering. That alone paid for the switch.",
  "The pages are fast, the editing is calm, and the site finally looks like the product.",
  "We shipped the new pricing page in an hour and A/B-tested the headline the same week.",
].map((quote, i) => ({ ...base("QuoteComponent", `Quote ${i + 1}`), quote, author: people[i] }));

// ── Sections ────────────────────────────────────────────────────────────────

const hero = {
  ...base("HeroComponent", "Hero"),
  title: "Launch the site your product deserves",
  subtitle:
    "A marketing website, a blog and a changelog, edited in BaseHub and served from Cloudflare's edge. This is sample content: connect a BaseHub repository to make it yours.",
  actions: [button("Get started", "/contact", "primary"), button("See the features", "/features", "secondary")],
  customerSatisfactionBanner: {
    ...base("CustomerSatisfactionBannerComponent", "Satisfaction"),
    text: "Loved by teams who ship every week",
    avatars: {
      items: people.map((p) => ({ ...base("AvatarComponent", p._title), avatar: p.image })),
    },
  },
};

const companiesSection = {
  ...base("CompaniesComponent", "Companies"),
  subtitle: "Trusted by teams at",
  companies,
};

const featureCards = {
  ...base("FeaturesCardsComponent", "Feature cards"),
  heading: headingComponent("Everything a launch needs", "Pages, posts and releases from one editor.", "Features"),
  featuresCardsList: {
    items: [
      {
        ...base("FeaturesCardsListItem", "Pages built from blocks"),
        description: "Heroes, feature grids, pricing, testimonials and FAQs — rearranged in the editor, published in a click.",
        image: darkLight("feature-blocks", 1200, 800, "Page sections stacked in an editor"),
        characteristics: { items: ["Reorder sections", "Reusable blocks", "Draft previews"].map((t) => base("CharacteristicsItem", t)) },
      },
      {
        ...base("FeaturesCardsListItem", "A blog and a changelog"),
        description: "Long-form posts with authors and categories, and release notes your customers can subscribe to.",
        image: darkLight("feature-blog", 1200, 800, "Blog posts and changelog entries side by side"),
        characteristics: { items: ["RSS feeds", "Authors", "Categories"].map((t) => base("CharacteristicsItem", t)) },
      },
    ],
  },
};

const featureIcons = ["bolt", "layers", "globe", "shield", "chart", "sparkles"];

const sideBySide = {
  ...base("FeaturesSideBySideComponent", "Side by side"),
  heading: headingComponent("Fast by default", "Every page is rendered ahead of time and served from the edge.", "Performance", "left"),
  actions: [button("Read the docs", "/blog", "secondary")],
  featuresSideBySideList: {
    items: [
      { title: "Pre-rendered pages", subtitle: "Built once, served as static assets from Cloudflare." },
      { title: "Images that fit", subtitle: "Responsive images for every screen size." },
      { title: "Dark mode", subtitle: "A light and a dark theme, following the visitor's system." },
    ].map((f, i) => ({
      ...base("FeaturesSideBySideListItem", f.title),
      subtitle: f.subtitle,
      icon: image(`/sample/icon-${featureIcons[i]}.svg`, 24, 24, ""),
    })),
  },
};

const bigFeature = {
  ...base("FeaturesBigImageComponent", "Big image"),
  heading: headingComponent("One editor for the whole site", "Content, navigation, theme and metadata — all in one place.", "Editing"),
  image: darkLight("feature-editor", 1600, 900, "The site's content in an editor"),
  featuresBigImageList: {
    items: [
      { title: "Navigation", description: "Header and footer links, edited like any other content." },
      { title: "Theme", description: "Pick an accent and a gray scale; the whole site follows." },
      { title: "Metadata", description: "Titles, descriptions and social images per page." },
    ].map((f, i) => ({
      ...base("FeaturesBigImageListItem", f.title),
      description: f.description,
      icon: image(`/sample/icon-${featureIcons[i + 3]}.svg`, 24, 24, ""),
    })),
  },
};

const testimonialsSlider = {
  ...base("TestimonialSliderComponent", "Testimonials"),
  heading: headingComponent("What teams say", "From launch day to the hundredth release.", "Testimonials"),
  quotes,
};

const plans = [
  { title: "Starter", price: "$0", billed: "Free forever", popular: false, list: ["One site", "Blog and changelog", "Community support"] },
  { title: "Team", price: "$29", billed: "per month", popular: true, list: ["Five sites", "Draft previews", "Form submissions", "Email support"] },
  { title: "Business", price: "$99", billed: "per month", popular: false, list: ["Unlimited sites", "Analytics", "SSO", "Priority support"] },
].map((p) => ({
  ...base("PricingPlanComponent", p.title),
  price: p.price,
  billed: p.billed,
  isMostPopular: p.popular,
  list: { items: p.list.map((t) => base("ListItem", t)) },
}));

const pricing = {
  ...base("PricingComponent", "Pricing"),
  heading: headingComponent("Simple pricing", "Start free and grow when you need to.", "Pricing"),
  plans: { items: plans.map((plan) => ({ ...base("PlanComponent", plan._title), plan })) },
};

function value(plan: (typeof plans)[number], v: boolean | string) {
  return {
    ...base("ValueComponent", `${plan._title} value`),
    plan,
    value:
      typeof v === "boolean"
        ? { ...base("BooleanComponent", "Included"), boolean: v }
        : { ...base("CustomTextComponent", v), text: v },
  };
}

const pricingTable = {
  ...base("PricingTableComponent", "Compare plans"),
  heading: headingComponent("Compare plans", "Every plan includes the editor and edge hosting.", null),
  categories: {
    items: [
      {
        title: "Publishing",
        features: [
          { title: "Sites", tooltip: "Separate websites", values: ["1", "5", "Unlimited"] },
          { title: "Draft previews", tooltip: null, values: [false, true, true] },
        ],
      },
      {
        title: "Insights",
        features: [
          { title: "Form submissions", tooltip: null, values: [false, true, true] },
          { title: "Analytics", tooltip: "Page views and clicks", values: [false, false, true] },
        ],
      },
    ].map((c) => ({
      ...base("CategoryComponent", c.title),
      features: {
        items: c.features.map((f) => ({
          ...base("FeatureComponent", f.title),
          tooltip: f.tooltip,
          values: { items: f.values.map((v, i) => value(plans[i]!, v)) },
        })),
      },
    })),
  },
};

const faqItems = [
  { q: "Is this real content?", a: `No — it is sample content that ships with ${SITE_NAME} so the site works before a CMS is connected. Connect a BaseHub repository and every page reads from it instead.` },
  { q: "How do I connect BaseHub?", a: "Create a repository from BaseHub's marketing website template, store its read token as the BASEHUB_TOKEN secret and redeploy." },
  { q: "Where is the site hosted?", a: "On Cloudflare Workers, with every page rendered ahead of time and served as static assets." },
  { q: "Do forms work?", a: "Once BaseHub is connected, form and newsletter submissions are stored in your repository. Until then they are accepted and discarded." },
];

const faq = {
  ...base("FaqComponent", "FAQ"),
  heading: headingComponent("Questions and answers", null, "FAQ"),
  questions: {
    items: faqItems.map((f) => ({ ...base("FaqItemComponent", f.q), answer: f.a })),
  },
};

const callout = {
  ...base("CalloutComponent", "Callout"),
  title: "Ready when you are",
  subtitle: "Connect a BaseHub repository and this page becomes yours.",
  actions: [button("Get started", "/contact", "primary"), button("Pricing", "/pricing", "secondary")],
};

const featureHero = {
  ...base("FeatureHeroComponent", "Features hero"),
  heroLayout: "Image bottom",
  heading: headingComponent("The features", "Everything in the template, at a glance.", "Features"),
  image: darkLight("feature-hero", 1600, 900, "The site's home page"),
  actions: [button("Get started", "/contact", "primary")],
};

const featuresGrid = {
  ...base("FeaturesGridComponent", "Features grid"),
  heading: headingComponent("Built for launches", null, null),
  actions: [button("Contact us", "/contact", "secondary")],
  featuresGridList: {
    items: [
      { title: "Sections", description: "Seventeen section types to compose pages from." },
      { title: "Search", description: "Full-text search over the blog once BaseHub is connected." },
      { title: "Feeds", description: "RSS for the blog and the changelog." },
      { title: "Sitemap", description: "Generated from the pages, posts and releases." },
      { title: "Forms", description: "Contact and newsletter forms stored in BaseHub." },
      { title: "Themes", description: "An accent and a gray scale for the whole site." },
    ].map((f, i) => ({
      ...base("FeatureWithIconComponent", f.title),
      description: f.description,
      icon: image(`/sample/icon-${featureIcons[i % featureIcons.length]}.svg`, 24, 24, ""),
    })),
  },
};

const testimonialsGrid = {
  ...base("TestimonialsGridComponent", "Testimonials grid"),
  heading: headingComponent("Teams ship faster", null, null),
  quotes,
};

const calloutV2 = {
  ...base("CalloutV2Component", "Callout v2"),
  title: "See it with your own content",
  subtitle: "Connect BaseHub, redeploy, and every section reads from your repository.",
  actions: [button("Get started", "/contact", "primary")],
};

const contactForm = {
  ...base("FormComponent", "Contact"),
  title: "Talk to us",
  subtitle: richText(paragraph("Tell us about your launch. Once BaseHub is connected, this form's submissions are stored in your repository.")),
  cta: button("Send", "#", "primary"),
  submissions: {
    __typename: "Submissions",
    ingestKey: SAMPLE_INGEST_KEY,
    schema: [
      { id: "name", name: "name", label: "Name", type: "text", required: true, placeholder: "Your name" },
      { id: "email", name: "email", label: "Email", type: "email", required: true, placeholder: "you@example.com" },
      { id: "message", name: "message", label: "Message", type: "textarea", required: false, placeholder: "What are you launching?" },
    ],
  },
};

const about = {
  ...base("FreeformTextComponent", "About"),
  body: richText(
    heading(2, `About ${SITE_NAME}`),
    paragraph("This page is a freeform text section: headings, paragraphs and lists, written in BaseHub's rich-text editor."),
    bullets("Edit it in BaseHub once connected.", "Add as many pages as you need.", "Every page is pre-rendered by the build."),
  ),
};

function page(pathname: string, title: string, description: string, sections: unknown[]) {
  return {
    ...base("PagesItem", title),
    pathname,
    metadataOverrides: { ...base("MetadataOverridesComponent", title), title: pathname === "/" ? null : title, description },
    sections,
  };
}

const pages = [
  page("/", "Home", "A marketing website, a blog and a changelog.", [hero, companiesSection, featureCards, sideBySide, bigFeature, testimonialsSlider, pricing, faq, callout]),
  page("/features", "Features", "Everything in the template, at a glance.", [featureHero, featuresGrid, testimonialsGrid, calloutV2]),
  page("/pricing", "Pricing", "Simple pricing for every stage.", [pricing, pricingTable, faq]),
  page("/contact", "Contact", "Talk to the team.", [contactForm]),
  page("/about", "About", `About ${SITE_NAME}.`, [about]),
];

// ── Blog and changelog ──────────────────────────────────────────────────────

const codeSnippet = {
  ...base("CodeSnippetComponent", "Deploy"),
  code: {
    __typename: "BlockCodeSnippet",
    code: "pnpm install\npnpm build\n",
    language: "bash",
    allowedLanguages: ["bash"],
  },
};

function blogPost(title: string, slug: string, publishedAt: string, category: string, author: number, description: string, body: unknown[]) {
  const b = base("BlogPostComponent", title);
  return {
    ...b,
    _slug: slug,
    _sys: { ...b._sys, slug },
    description,
    publishedAt,
    categories: [category],
    authors: [people[author]],
    image: darkLight("post", 1600, 900, title),
    ogImage: { __typename: "BlockOgImage", url: "/sample/og.svg", width: 1200, height: 630 },
    body: { __typename: "Body_1", json: { content: body, toc: [], blocks: [codeSnippet] } },
  };
}

const posts = [
  blogPost("Shipping a launch page in an afternoon", "shipping-a-launch-page", "2026-10-20T09:00:00.000Z", "Guide", 0,
    "How the section blocks fit together into a page.", [
      paragraph("A launch page is a handful of sections in the right order: a hero, a few features, proof, pricing and a call to action."),
      heading(2, "Start with the hero"),
      paragraph("Say what the product does in one line, and give the visitor one thing to click."),
      heading(2, "Then the proof"),
      paragraph("Logos, quotes and numbers. Keep them short."),
      { type: "basehub-block", attrs: { id: codeSnippet._id } },
    ]),
  blogPost("Writing release notes people read", "writing-release-notes", "2026-10-10T09:00:00.000Z", "Productivity", 2,
    "A changelog is a promise kept in public.", [
      paragraph("Lead with what changed for the reader, not what changed in the code."),
      bullets("One change per entry.", "A picture when it helps.", "A link to the details."),
    ]),
  blogPost("Measuring what a page does", "measuring-what-a-page-does", "2026-09-28T09:00:00.000Z", "Efficiency", 1,
    "Page views, clicks and form submissions, without a second tool.", [
      paragraph("Once BaseHub is connected, the site records page views and button clicks against your repository's events."),
    ]),
];

function changelogPost(title: string, slug: string, publishedAt: string, excerpt: string, body: unknown[]) {
  const b = base("ChangelogPostComponent", title);
  return {
    ...b,
    _slug: slug,
    _sys: { ...b._sys, slug },
    excerpt,
    publishedAt,
    authors: [people[3]],
    image: image("/sample/release-light.svg", 1600, 900, title),
    ogImage: { __typename: "BlockOgImage", url: "/sample/og.svg", width: 1200, height: 630 },
    body: { __typename: "Body", json: { content: body, toc: [], blocks: [codeSnippet] } },
  };
}

const releases = [
  changelogPost("Dark mode", "dark-mode", "2026-10-15T09:00:00.000Z", "Every page now follows the visitor's light or dark preference.", [
    paragraph("The theme switch in the footer sets it explicitly."),
  ]),
  changelogPost("Pricing comparison table", "pricing-comparison-table", "2026-10-01T09:00:00.000Z", "Compare plans feature by feature.", [
    paragraph("Add a pricing table section to any page."),
    { type: "basehub-block", attrs: { id: codeSnippet._id } },
  ]),
  changelogPost("RSS feeds", "rss-feeds", "2026-09-20T09:00:00.000Z", "The blog and the changelog each have a feed.", [
    paragraph("Subscribe at /blog/rss.xml and /changelog/rss.xml."),
  ]),
];

const sourceLink = {
  ...base("SocialLinkComponent", "Source"),
  url: SOURCE_URL,
  icon: image("/sample/icon-code.svg", 24, 24, "Source code"),
};

export const SAMPLE = {
  _componentInstances: { blogPost: { _searchKey: SAMPLE_SEARCH_KEY } },
  collections: { authors: { items: people } },
  site: {
    __typename: "Site",
    generalEvents: { __typename: "GeneralEvents", ingestKey: SAMPLE_INGEST_KEY },
    settings: {
      ...base("Settings", "Settings"),
      showUseTemplate: false,
      theme: { ...base("Theme", "Theme"), accent: "blue", grayScale: "zinc" },
      logo: {
        __typename: "DarkLightImageComponent",
        dark: image("/sample/logo-dark.svg", 160, 32, SITE_NAME),
        light: image("/sample/logo-light.svg", 160, 32, SITE_NAME),
      },
      logoLite: image("/sample/logo-mark.svg", 32, 32, SITE_NAME),
      metadata: {
        ...base("Metadata", "Metadata"),
        sitename: SITE_NAME,
        titleTemplate: `%s | ${SITE_NAME}`,
        defaultTitle: "Home",
        defaultDescription: "A marketing website, a blog and a changelog, edited in BaseHub and served from Cloudflare.",
        favicon: { ...image("/sample/logo-mark.svg", 32, 32), mimeType: "image/svg+xml" },
        ogImage: { __typename: "BlockOgImage", url: "/sample/og.svg", width: 1200, height: 630 },
        xAccount: null,
      },
    },
    header: {
      ...base("Header", "Header"),
      navbar: {
        items: [
          { ...base("HeaderNavbarLinkComponent", "Features"), href: "/features", sublinks: { items: [] } },
          { ...base("HeaderNavbarLinkComponent", "Pricing"), href: "/pricing", sublinks: { items: [] } },
          {
            ...base("HeaderNavbarLinkComponent", "Resources"),
            href: null,
            sublinks: {
              items: [
                { ...base("SublinksItem", "Blog"), link: { ...base("CustomTextComponent", "/blog"), text: "/blog" } },
                { ...base("SublinksItem", "Changelog"), link: { ...base("CustomTextComponent", "/changelog"), text: "/changelog" } },
                { ...base("SublinksItem", "About"), link: { ...base("PageReferenceComponent", "About"), page: { pathname: "/about", _title: "About" } } },
              ],
            },
          },
          { ...base("HeaderNavbarLinkComponent", "Contact"), href: "/contact", sublinks: { items: [] } },
        ],
      },
      rightCtas: { items: [button("Source", SOURCE_URL, "secondary"), button("Get started", "/contact", "primary")] },
    },
    footer: {
      ...base("Footer", "Footer"),
      copyright: `© ${new Date().getUTCFullYear()} ${SITE_NAME}`,
      navbar: {
        items: [
          { ...base("NavbarItem", "Features"), url: "/features" },
          { ...base("NavbarItem", "Pricing"), url: "/pricing" },
          { ...base("NavbarItem", "Blog"), url: "/blog" },
          { ...base("NavbarItem", "Changelog"), url: "/changelog" },
          { ...base("NavbarItem", "Contact"), url: "/contact" },
        ],
      },
      socialLinks: [sourceLink],
      newsletter: {
        ...base("Newsletter", "Newsletter"),
        title: "Stay in the loop",
        description: "Product updates, once a month. Submissions are stored once BaseHub is connected.",
        submissions: {
          __typename: "Submissions_1",
          ingestKey: SAMPLE_INGEST_KEY,
          schema: [{ id: "email", name: "email", label: "Email", type: "email", required: true, placeholder: "you@example.com" }],
        },
      },
    },
    pages: { items: pages },
    blog: {
      ...base("Blog", "Blog"),
      mainTitle: "Blog",
      listTitle: "All posts",
      metadata: { ...base("MetadataOverridesComponent", "Blog"), title: "Blog", description: "Guides and notes from the team." },
      featuredPosts: posts.slice(0, 2),
      posts: { items: posts },
    },
    changelog: {
      ...base("Changelog", "Changelog"),
      title: "Changelog",
      subtitle: "What's new, release by release.",
      goBackText: "Back to the changelog",
      socialLinksTitle: "Follow along",
      socialLinks: [sourceLink],
      metadata: { ...base("MetadataOverridesComponent", "Changelog"), title: "Changelog", description: "What's new, release by release." },
      posts: { items: releases },
    },
  },
};
