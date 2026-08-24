import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { fetchShopConfig, fetchShopInstaData, fetchAllInstagramMedia } from "../instagramApi.server";
import { withRateLimit, trackApiResponse } from "../rateLimiter.server";
import { invalidateResource, cacheGetOrSet } from "../cache.server";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Banner,
  Button,
  ButtonGroup,
  TextField,
  Select,
  RangeSlider,
  Checkbox,
  Tabs,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  Collapsible,
  ProgressBar,
  Modal,
  Icon,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
} from "@shopify/polaris";
import {
  RefreshIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HeartIcon,
  ChatIcon,
  LinkIcon,
  StarIcon,
  StoreIcon,
  DesktopIcon,
  MobileIcon,
  ViewIcon,
  ShareIcon,
  ExternalIcon,
} from "@shopify/polaris-icons";

// ─────────────────────────────────────────────────────────────────────────────
// Renders plain text with any bare URLs turned into clickable links.
// ─────────────────────────────────────────────────────────────────────────────
const linkifyText = (text) => {
  const parts = String(text).split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--p-color-text-brand)", fontWeight: 600, textDecoration: "underline" }}
      >
        {part}
      </a>
    ) : (
      part
    )
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM ICONS
// ─────────────────────────────────────────────────────────────────────────────
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const VideoMediaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d="M2 7.25h3.614L9.364 2H6a4 4 0 0 0-4 4v1.25Zm20 0h-6.543l3.641-5.097A4.002 4.002 0 0 1 22 6v1.25ZM2 8.75h20V18a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8.75Zm5.457-1.5L11.207 2h6.157l-3.75 5.25H7.457Zm7.404 7.953a.483.483 0 0 0 0-.837l-3.985-2.3a.483.483 0 0 0-.725.418v4.601c0 .372.403.605.725.419l3.985-2.301Z" />
  </svg>
);

const CarouselMediaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill="#FFFFFF" d="M20.453 8.5c.005.392.005.818.005 1.279v3.2c0 1.035 0 1.892-.057 2.591-.06.728-.187 1.403-.511 2.038a5.214 5.214 0 0 1-2.278 2.279c-.636.323-1.31.451-2.038.51-.699.058-1.556.058-2.59.058h-3.2c-.32 0-.624 0-.911-.002H5.395A3.856 3.856 0 0 0 8.485 22h7.724A5.793 5.793 0 0 0 22 16.207V8.483a3.856 3.856 0 0 0-1.548-3.093V8.5Z"/>
    <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d="M2 5.4A3.4 3.4 0 0 1 5.4 2h10.2A3.4 3.4 0 0 1 19 5.4v5.482l-1.91-1.25a4.037 4.037 0 0 0-4.767.253L7.87 13.528a2.763 2.763 0 0 1-3.262.173L2 11.994V5.4Zm14.392 5.299L19 12.406V15.6a3.4 3.4 0 0 1-3.4 3.4H5.4A3.4 3.4 0 0 1 2 15.6v-2.082l1.91 1.25a4.038 4.038 0 0 0 4.767-.253l4.453-3.643a2.763 2.763 0 0 1 3.262-.173ZM7.525 9.65a2.125 2.125 0 1 0 0-4.25 2.125 2.125 0 0 0 0 4.25Z"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// CACHED THEME EMBED & SECTION VERIFIER
// ─────────────────────────────────────────────────────────────────────────────
async function getCachedThemeEmbedStatus(shop, themeId, accessToken, clientId) {
  if (!themeId || themeId === "current" || !accessToken) {
    return { dynamicAppEmbedEnabled: false, dynamicSections: { grid: false, story: false } };
  }
  const cacheKey = `theme_embed_status:${shop}:${themeId}`;
  return cacheGetOrSet(
    cacheKey,
    async () => {
      let dynamicAppEmbedEnabled = false;
      let dynamicSections = { grid: false, story: false };
      try {
        const apiVersion = "2024-01";
        const assetKeys = [
          "config/settings_data.json",
          "templates/index.json",
          "templates/product.json",
          "templates/page.json",
          "templates/collection.json",
        ];

        const assetPromises = assetKeys.map((key) => {
          const url = `https://${shop}/admin/api/${apiVersion}/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(key)}`;
          return fetch(url, {
            headers: {
              "X-Shopify-Access-Token": accessToken,
              "Content-Type": "application/json",
            },
          })
            .then((res) => res.json())
            .catch(() => null);
        });

        const [settingsData, indexData, productData, pageData, collectionData] = await Promise.all(assetPromises);
        const extUuid = "eeecd3e9-ddb8-f1f8-6e66-ef13a12c0780e5eb934b";
        const appHandle = "instafeed";

        if (settingsData?.asset?.value) {
          try {
            const parsedSettings = JSON.parse(settingsData.asset.value);
            if (parsedSettings.current?.blocks) {
              dynamicAppEmbedEnabled = Object.values(parsedSettings.current.blocks).some(
                (b) =>
                  b.type &&
                  (b.type.includes(clientId) || b.type.includes(extUuid) || b.type.includes(appHandle)) &&
                  b.type.includes("app-embed") &&
                  !b.disabled
              );
            }
          } catch (e) {}
        }

        const templates = [indexData, productData, pageData, collectionData];
        for (const t of templates) {
          if (t?.asset?.value) {
            try {
              const parsedTemplate = JSON.parse(t.asset.value);
              if (parsedTemplate.sections) {
                for (const sectionObj of Object.values(parsedTemplate.sections)) {
                  if (sectionObj.disabled) continue;

                  if (
                    sectionObj.type &&
                    (sectionObj.type.includes(extUuid) ||
                      sectionObj.type.includes(appHandle) ||
                      sectionObj.type.includes(clientId))
                  ) {
                    if (sectionObj.type.includes("feed-grid")) dynamicSections.grid = true;
                    if (sectionObj.type.includes("story-layout")) dynamicSections.story = true;
                  }

                  if (sectionObj.blocks) {
                    for (const blockObj of Object.values(sectionObj.blocks)) {
                      if (blockObj.disabled) continue;
                      if (
                        blockObj.type &&
                        (blockObj.type.includes(extUuid) ||
                          blockObj.type.includes(appHandle) ||
                          blockObj.type.includes(clientId))
                      ) {
                        if (blockObj.type.includes("feed-grid")) dynamicSections.grid = true;
                        if (blockObj.type.includes("story-layout")) dynamicSections.story = true;
                      }
                    }
                  }
                }
              }
            } catch (err) {}
          }
        }
      } catch (e) {
        console.warn("Theme asset verification failed:", e.message);
      }
      return { dynamicAppEmbedEnabled, dynamicSections };
    },
    300
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADER
// ─────────────────────────────────────────────────────────────────────────────
export const loader = async ({ request }) => {
  const { admin, session, billing } = await authenticate.admin(request);
  const shop = session?.shop ?? "unknown";

  const isTest = process.env.BILLING_TEST_MODE !== "false";

  const [billingResult, configResult, instaResult, themeRes] = await Promise.allSettled([
    billing.check({ plans: ["Pro Monthly"], isTest }),
    withRateLimit(shop, () => fetchShopConfig(admin, shop)),
    fetchShopInstaData(admin, shop),
    admin.graphql(`{ themes(first: 25) { nodes { id name role } } }`),
  ]);

  let subscription = null;
  if (billingResult.status === "fulfilled") {
    const billingCheck = billingResult.value;
    if (billingCheck.hasActivePayment) {
      const activeSub = billingCheck.appSubscriptions.find((s) => s.status === "ACTIVE");
      if (activeSub) subscription = activeSub;
    }
  } else {
    console.error("Billing check error:", billingResult.reason?.message);
  }

  const config = configResult.status === "fulfilled" ? configResult.value : null;
  const instaData = instaResult.status === "fulfilled" ? instaResult.value : null;
  if (configResult.status === "rejected") console.error("Config fetch error:", configResult.reason);

  trackApiResponse(shop, {});

  const requestUrl = new URL(request.url);
  const selectedThemeParam = requestUrl.searchParams.get("selectedThemeId") || requestUrl.searchParams.get("themeId");

  let allThemes = [];
  let themeId = "current";

  if (themeRes.status === "fulfilled") {
    try {
      const themeJson = await themeRes.value.json();
      const nodes = themeJson.data?.themes?.nodes || [];
      allThemes = nodes.map((t) => {
        const numericId = t.id.split("/").pop();
        const isLive = t.role === "MAIN";
        return {
          id: numericId,
          name: t.name || `Theme #${numericId}`,
          role: t.role,
          isLive,
        };
      });
      allThemes.sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0));

      const mainTheme = allThemes.find((t) => t.isLive);
      const matchedSelected = selectedThemeParam ? allThemes.find((t) => t.id === selectedThemeParam) : null;
      themeId = matchedSelected ? matchedSelected.id : mainTheme ? mainTheme.id : allThemes[0]?.id || "current";
    } catch (err) {
      console.warn("Failed to parse themes JSON", err);
    }
  }

  const clientId = process.env.SHOPIFY_API_KEY;
  const { dynamicAppEmbedEnabled, dynamicSections } = await getCachedThemeEmbedStatus(
    session?.shop,
    themeId,
    session?.accessToken,
    clientId
  );

  return {
    config: config ? JSON.stringify(config) : null,
    instaData: instaData ? JSON.stringify(instaData) : null,
    subscription,
    shop,
    themeId,
    allThemes,
    selectedThemeId: themeId,
    clientId,
    dynamicAppEmbedEnabled,
    dynamicSections,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION
// ─────────────────────────────────────────────────────────────────────────────
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop ?? "unknown";
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "saveConfig") {
    const configData = formData.get("config");
    try {
      const shopRes = await admin.graphql(`{ shop { id } }`);
      const shopJson = await shopRes.json();
      const shopId = shopJson.data.shop.id;

      const parsedConfig = JSON.parse(configData);
      const metafields = [
        {
          ownerId: shopId,
          namespace: "ai_instafeed",
          key: "config",
          type: "json",
          value: configData,
        },
      ];

      if (!parsedConfig.instagramHandle) {
        metafields.push({
          ownerId: shopId,
          namespace: "ai_instafeed",
          key: "insta_data",
          type: "json",
          value: "null",
        });
      }

      const saveRes = await admin.graphql(
        `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            userErrors { message }
          }
        }`,
        { variables: { metafields } }
      );

      const saveJson = await saveRes.json();
      if (saveJson.data?.metafieldsSet?.userErrors?.length > 0) {
        return { error: saveJson.data.metafieldsSet.userErrors[0].message };
      }
      await invalidateResource(shop, "config");
      await invalidateResource(shop, "insta_data");
      return { success: true, message: "Settings updated successfully" };
    } catch (e) {
      return { error: e.message || "Failed to save metafield" };
    }
  }

  const handle = formData.get("handle");

  if (!handle) return { error: "Please enter an Instagram username." };
  if (!process.env.FACEBOOK_ACCESS_TOKEN) {
    return { error: "Instagram connection isn't configured for this store yet. Please contact support." };
  }

  try {
    const allData = await fetchAllInstagramMedia(handle, shop);
    const shopRes = await admin.graphql(`{ shop { id } }`);
    const shopJson = await shopRes.json();
    const shopId = shopJson.data.shop.id;

    await admin.graphql(
      `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { message }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              ownerId: shopId,
              namespace: "ai_instafeed",
              key: "insta_data",
              type: "json",
              value: JSON.stringify(allData),
            },
          ],
        },
      }
    );
    await invalidateResource(shop, "insta_data");

    return { data: allData };
  } catch (error) {
    return { error: error.message || "Failed to fetch Instagram data" };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT CONFIG & PRESETS
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  instagramHandle: "",
  aiCommentModeration: false,
  appSetup: { mainExt: false, sectionExt: false },
  postFeed: {
    header: true,
    metrics: true,
    load: false,
    carousel: true,
    autoplay: true,
    modalSound: false,
    modalNavigation: true,
    heading: "SHOP OUR INSTAGRAM",
    subheading: "Tag us @account to get featured in our gallery!",
    typography: {
      heading: { size: 18, weight: "800", color: "#111827" },
      subheading: { size: 12, weight: "500", color: "#6b7280" },
    },
    alignment: "center",
    desktopColumns: 4,
    mobileColumns: 2,
    desktopLimit: 8,
    mobileLimit: 4,
    gap: 16,
    aspectRatio: "auto",
    removeWatermark: false,
    showInstagramIcon: true,
    showFollowButton: true,
    hiddenPostIds: [],
    paddingTop: 32,
    paddingBottom: 32,
    mediaTypeFilter: "all",
    sortBy: "latest",
  },
  stories: {
    enable: true,
    promoEnable: true,
    promoLabel: "Get 10% Off",
    promoDesc: "Take a screenshot of a product you wish to buy and tag us on Instagram for a 10% discount code!",
    showLabels: false,
    carousel: true,
    autoplay: true,
    alignment: "center",
    showHeader: true,
    heading: "SHOP OUR INSTAGRAM",
    subheading: "Tag us @account to get featured in our gallery!",
    typography: {
      heading: { size: 28, weight: "800", color: "#000" },
      subheading: { size: 14, weight: "400", color: "#666" },
    },
    animateImages: false,
    activeRing: false,
    pulseRing: false,
    ringColor: "#e1306c",
    showNavigation: true,
    paddingTop: 24,
    paddingBottom: 24,
    openPopup: true,
    removeWatermark: false,
    showFollowButton: false,
    mediaTypeFilter: "all",
    sortBy: "latest",
  },
};

const FEED_TYPOGRAPHY_PRESETS = [
  {
    name: "Modern Shoppable",
    desc: "Default bold look with shop instructions.",
    textHeading: "SHOP OUR INSTAGRAM",
    textSubheading: "Click on any post to shop the look instantly.",
    heading: { size: 24, weight: "800", color: "#1a1a1a" },
    subheading: { size: 14, weight: "500", color: "#4b5563" },
  },
  {
    name: "Social Proof",
    desc: "Clean customer showcase and lifestyle focus.",
    textHeading: "AS SEEN ON SOCIAL",
    textSubheading: "See how our community styles their favorite pieces.",
    heading: { size: 24, weight: "800", color: "#111827" },
    subheading: { size: 13, weight: "400", color: "#6b7280" },
  },
  {
    name: "Community Feed",
    desc: "Encouraging tagging and sharing.",
    textHeading: "JOIN THE COMMUNITY",
    textSubheading: "Tag us on Instagram to be featured on our page!",
    heading: { size: 22, weight: "800", color: "#0f172a" },
    subheading: { size: 13, weight: "500", color: "#475569" },
  },
  {
    name: "Minimalist Style",
    desc: "Subtle headings for clean design aesthetics.",
    textHeading: "Insta Gallery",
    textSubheading: "Curated moments from our daily feed.",
    heading: { size: 18, weight: "600", color: "#374151" },
    subheading: { size: 12, weight: "400", color: "#9ca3af" },
  },
  {
    name: "Luxury Lookbook",
    desc: "Sophisticated editorial serif vibe.",
    textHeading: "THE LOOKBOOK",
    textSubheading: "A visual journal of modern luxury and craftsmanship.",
    heading: { size: 28, weight: "800", color: "#000000" },
    subheading: { size: 15, weight: "400", color: "#1f2937" },
  },
  {
    name: "Vibrant Brand",
    desc: "Vivid Instagram-themed pink highlights.",
    textHeading: "FOLLOW US ON INSTAGRAM",
    textSubheading: "Get daily inspiration, updates, and behind-the-scenes access.",
    heading: { size: 24, weight: "800", color: "#e1306c" },
    subheading: { size: 13, weight: "500", color: "#c13584" },
  },
];

const isPresetMatch = (currentConfigSection, preset) => {
  if (!currentConfigSection || !currentConfigSection.typography) return false;
  const typo = currentConfigSection.typography;
  const checkColor = (c1, c2) => String(c1 || "").trim().toLowerCase() === String(c2 || "").trim().toLowerCase();
  return (
    String(currentConfigSection.heading || "").trim() === String(preset.textHeading || "").trim() &&
    String(currentConfigSection.subheading || "").trim() === String(preset.textSubheading || "").trim() &&
    Number(typo.heading.size) === Number(preset.heading.size) &&
    String(typo.heading.weight) === String(preset.heading.weight) &&
    checkColor(typo.heading.color, preset.heading.color) &&
    Number(typo.subheading.size) === Number(preset.subheading.size) &&
    String(typo.subheading.weight) === String(preset.subheading.weight) &&
    checkColor(typo.subheading.color, preset.subheading.color)
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Index() {
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const saveFetcher = useFetcher();
  const loaderData = useLoaderData() || {};

  const [isHydrated, setIsHydrated] = useState(false);
  const [isAppBridgeReady, setIsAppBridgeReady] = useState(false);

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const activeTab = selectedTabIndex === 0 ? "post" : "story";
  const [previewDevice, setPreviewDevice] = useState("mobile");

  const isPaid = !!loaderData.subscription;
  const planName = loaderData.subscription?.name || "Free Plan";

  const [instaData, setInstaData] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isInfiniteLoading, setIsInfiniteLoading] = useState(false);
  const [extraLoadCount, setExtraLoadCount] = useState(0);
  const [connectError, setConnectError] = useState(null);

  const PLACEHOLDER_MEDIA = useMemo(() => {
    const baseUrls = [
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1539106604-24283ef1677b?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1529139513364-c4d1221e93c0?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1485230895905-ec17bd36b5cc?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1475184447565-30060953d611?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=600&h=600&fit=crop",
    ];
    return Array.from({ length: 24 }).map((_, i) => ({
      id: `placeholder_${i}`,
      media_url: baseUrls[i % baseUrls.length],
      media_type: "IMAGE",
      like_count: 120 + ((i * 5) % 80),
      comments_count: 8 + ((i * 2) % 15),
    }));
  }, []);

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [lastSavedConfig, setLastSavedConfig] = useState(null);
  const [isHideMode, setIsHideMode] = useState(false);

  const [isPostModulesExpanded, setIsPostModulesExpanded] = useState(true);
  const [isPostLayoutExpanded, setIsPostLayoutExpanded] = useState(false);
  const [isPostBrandingExpanded, setIsPostBrandingExpanded] = useState(false);
  const [isStoryModulesExpanded, setIsStoryModulesExpanded] = useState(true);
  const [isStoryBrandingExpanded, setIsStoryBrandingExpanded] = useState(false);

  const [errors, setErrors] = useState({});
  const mobileCarouselRef = useRef(null);
  const desktopCarouselRef = useRef(null);

  // ── Sync with Loader Data ──
  useEffect(() => {
    setIsHydrated(true);
    if (shopify) setIsAppBridgeReady(true);

    let loadedConfig = null;
    if (loaderData.config) {
      try {
        loadedConfig = typeof loaderData.config === "string" ? JSON.parse(loaderData.config) : loaderData.config;
      } catch (e) {}
    }

    const merged = {
      ...DEFAULT_CONFIG,
      ...loadedConfig,
      postFeed: {
        ...DEFAULT_CONFIG.postFeed,
        ...(loadedConfig?.postFeed || {}),
        typography: {
          ...DEFAULT_CONFIG.postFeed.typography,
          ...(loadedConfig?.postFeed?.typography || {}),
          heading: {
            ...DEFAULT_CONFIG.postFeed.typography.heading,
            ...(loadedConfig?.postFeed?.typography?.heading || {}),
          },
          subheading: {
            ...DEFAULT_CONFIG.postFeed.typography.subheading,
            ...(loadedConfig?.postFeed?.typography?.subheading || {}),
          },
        },
      },
      stories: {
        ...DEFAULT_CONFIG.stories,
        ...(loadedConfig?.stories || {}),
        typography: {
          ...DEFAULT_CONFIG.stories.typography,
          ...(loadedConfig?.stories?.typography || {}),
          heading: {
            ...DEFAULT_CONFIG.stories.typography.heading,
            ...(loadedConfig?.stories?.typography?.heading || {}),
          },
          subheading: {
            ...DEFAULT_CONFIG.stories.typography.subheading,
            ...(loadedConfig?.stories?.typography?.subheading || {}),
          },
        },
      },
    };

    setConfig(merged);
    setLastSavedConfig(merged);

    if (loaderData.instaData) {
      try {
        const parsedInsta =
          typeof loaderData.instaData === "string" ? JSON.parse(loaderData.instaData) : loaderData.instaData;
        setInstaData(parsedInsta);
      } catch (e) {}
    }
  }, [loaderData, shopify]);

  const isConnected = useMemo(() => {
    if (!instaData || !config.instagramHandle) return false;
    return config.instagramHandle.trim().toLowerCase() === instaData.username?.toLowerCase();
  }, [instaData, config.instagramHandle]);

  const setupProgress = [
    loaderData.dynamicAppEmbedEnabled ? 1 : 0,
    loaderData.dynamicSections?.grid || loaderData.dynamicSections?.story ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
  const isSetupComplete = setupProgress === 2;

  const [isConnectExpanded, setIsConnectExpanded] = useState(!isConnected);
  const [isSetupExpanded, setIsSetupExpanded] = useState(isConnected && !isSetupComplete);

  useEffect(() => {
    setIsConnectExpanded(!isConnected);
    setIsSetupExpanded(isConnected && !isSetupComplete);
  }, [isConnected, isSetupComplete]);

  // ── Handle Fetcher Responses ──
  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.data) {
      const { username, media, _totalPages } = fetcher.data.data;
      setInstaData(fetcher.data.data);
      setConnectError(null);
      setExtraLoadCount(0);

      const newConfig = {
        ...config,
        instagramHandle: username,
        postFeed: {
          ...config.postFeed,
          subheading: config.postFeed.subheading.replace(/@[\w.]+/g, `@${username}`),
        },
        stories: {
          ...config.stories,
          subheading: config.stories.subheading.replace(/@[\w.]+/g, `@${username}`),
        },
      };

      setConfig(newConfig);
      setLastSavedConfig(newConfig);

      const fd = new FormData();
      fd.append("intent", "saveConfig");
      fd.append("config", JSON.stringify(newConfig));
      saveFetcher.submit(fd, { method: "post" });

      const totalPosts = media?.data?.length || 0;
      const pages = _totalPages || 1;
      shopify?.toast?.show(
        `✓ Connected @${username} · ${totalPosts} posts synced (${pages} page${pages > 1 ? "s" : ""} crawled)`
      );
    } else if (fetcher.data.error) {
      setConnectError(fetcher.data.error);
      shopify?.toast?.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  const handleDisconnect = useCallback(() => {
    setInstaData(null);
    const newConfig = { ...config, instagramHandle: "" };
    setConfig(newConfig);
    setLastSavedConfig(newConfig);

    const fd = new FormData();
    fd.append("intent", "saveConfig");
    fd.append("config", JSON.stringify(newConfig));
    saveFetcher.submit(fd, { method: "post" });

    shopify?.toast?.show("Instagram account disconnected successfully.");
  }, [config, saveFetcher, shopify]);

  const updateConfig = useCallback((section, key, value) => {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    if (key === "mobileColumns" || key === "mobileLimit") setPreviewDevice("mobile");
    if (key === "desktopColumns" || key === "desktopLimit") setPreviewDevice("desktop");
    if (section === "stories") setSelectedTabIndex(1);
    if (section === "postFeed") setSelectedTabIndex(0);
  }, []);

  // ── Dirty State & Save Bar ──
  const hasChanges = useMemo(() => {
    if (!lastSavedConfig) return false;
    return JSON.stringify(config) !== JSON.stringify(lastSavedConfig);
  }, [config, lastSavedConfig]);

  useEffect(() => {
    const saveBar = document.getElementById("app-config-save-bar");
    if (!saveBar) return;
    if (hasChanges) {
      saveBar.show();
    } else {
      saveBar.hide();
    }
  }, [hasChanges]);

  const applyChanges = useCallback(() => {
    const fd = new FormData();
    fd.append("intent", "saveConfig");
    fd.append("config", JSON.stringify(config));
    saveFetcher.submit(fd, { method: "post" });
    setLastSavedConfig(config);
    shopify?.toast?.show("Changes saved successfully!");
  }, [config, saveFetcher, shopify]);

  const discardChanges = useCallback(() => {
    if (lastSavedConfig) {
      setConfig(lastSavedConfig);
      shopify?.toast?.show("Unsaved changes discarded.");
    }
  }, [lastSavedConfig, shopify]);

  const handleToggleHidePost = useCallback((postId) => {
    setConfig((prev) => {
      const currentHidden = prev.postFeed.hiddenPostIds || [];
      const isCurrentlyHidden = currentHidden.includes(postId);
      const nextHidden = isCurrentlyHidden
        ? currentHidden.filter((id) => id !== postId)
        : [...currentHidden, postId];

      return {
        ...prev,
        postFeed: {
          ...prev.postFeed,
          hiddenPostIds: nextHidden,
        },
      };
    });
  }, []);

  // ── Formatted Data for Preview ──
  const baseMedia = useMemo(() => {
    if (instaData?.media?.data?.length > 0) return instaData.media.data;
    return PLACEHOLDER_MEDIA;
  }, [instaData, PLACEHOLDER_MEDIA]);

  const filteredGridMedia = useMemo(() => {
    let list = [...baseMedia];
    const filter = config.postFeed.mediaTypeFilter;
    if (filter === "images") {
      list = list.filter((m) => {
        const t = (m.media_type || "").toUpperCase();
        return t === "IMAGE" || t === "CAROUSEL_ALBUM" || t === "ALBUM";
      });
    } else if (filter === "videos") {
      list = list.filter((m) => {
        const t = (m.media_type || "").toUpperCase();
        return t === "VIDEO" || t === "REEL";
      });
    }
    if (isPaid && config.postFeed.sortBy === "engaging") {
      list.sort((a, b) => ((b.like_count || 0) + (b.comments_count || 0)) - ((a.like_count || 0) + (a.comments_count || 0)));
    }
    return list;
  }, [baseMedia, config.postFeed.mediaTypeFilter, config.postFeed.sortBy, isPaid]);

  const simulatedInfiniteMedia = useMemo(() => {
    if (config.postFeed.carousel) return filteredGridMedia;
    const limit = previewDevice === "mobile" ? config.postFeed.mobileLimit || 4 : config.postFeed.desktopLimit || 8;
    const effectiveLimit = limit + extraLoadCount;
    return filteredGridMedia.slice(0, effectiveLimit);
  }, [filteredGridMedia, config.postFeed.carousel, previewDevice, config.postFeed.mobileLimit, config.postFeed.desktopLimit, extraLoadCount]);

  const hasMoreToShow = simulatedInfiniteMedia.length < filteredGridMedia.length;

  const handleScroll = useCallback(
    (e, orientation = "vertical") => {
      const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
      const threshold = 150;
      const nearEnd =
        orientation === "vertical"
          ? scrollHeight - scrollTop - clientHeight < threshold
          : scrollWidth - scrollLeft - clientWidth < threshold;

      if (nearEnd && hasMoreToShow && !isInfiniteLoading) {
        setIsInfiniteLoading(true);
        setTimeout(() => {
          setExtraLoadCount((prev) => prev + (previewDevice === "mobile" ? 4 : 8));
          setIsInfiniteLoading(false);
        }, 100);
      }
    },
    [isInfiniteLoading, previewDevice, hasMoreToShow]
  );

  const scrollCarousel = useCallback((ref, direction) => {
    if (!ref.current) return;
    const amount = ref.current.clientWidth * 0.8;
    ref.current.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }, []);

  const formatDynamicAccountText = (text) => {
    if (!text) return "";
    const handle = instaData?.username || config.instagramHandle || "account";
    return text.replace(/@account/gi, `@${handle}`);
  };

  const isSyncing = fetcher.state !== "idle";

  if (!isHydrated || !isAppBridgeReady) {
    return (
      <SkeletonPage primaryAction>
        <Layout>
          <Layout.Section>
            <Card>
              <SkeletonDisplayText size="small" />
              <Box paddingBlockStart="400">
                <SkeletonBodyText lines={3} />
              </Box>
            </Card>
            <Box paddingBlockStart="400">
              <Card>
                <SkeletonDisplayText size="small" />
                <Box paddingBlockStart="400">
                  <SkeletonBodyText lines={6} />
                </Box>
              </Card>
            </Box>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <SkeletonDisplayText size="small" />
                <SkeletonBodyText lines={2} />
                <SkeletonDisplayText size="small" />
                <SkeletonBodyText lines={6} />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MEDIA CARD RENDERER
  // ─────────────────────────────────────────────────────────────────────────
  const renderMediaCard = (item, i) => {
    const itemIdentifier = item.id || item.media_url;
    const isHidden = config.postFeed.hiddenPostIds?.includes(itemIdentifier);
    const aspect = config.postFeed.aspectRatio === "auto" ? "auto" : config.postFeed.aspectRatio || "1/1";

    const rawType = (item.media_type || "").toUpperCase();
    const isVideo = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));
    const isAlbum = rawType === "CAROUSEL_ALBUM" || rawType === "ALBUM";

    return (
      <div
        key={i}
        className="grid-item"
        onClick={() => {
          if (isHideMode) {
            handleToggleHidePost(itemIdentifier);
          } else {
            setSelectedPost(item);
          }
        }}
        style={{
          aspectRatio: aspect,
          background: "#f1f5f9",
          borderRadius: 0,
          border: "1px solid #e2e8f0",
          boxSizing: "border-box",
          overflow: "hidden",
          position: "relative",
          cursor: isHideMode ? "pointer" : "default",
          opacity: isHideMode && isHidden ? 0.4 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {isHideMode && isHidden && (
          <div className="hidden-post-overlay">
            <span className="hidden-post-stamp">
              <Icon source={ViewIcon} tone="inherit" /> HIDDEN
            </span>
            <span className="hidden-post-hint">tap to unhide</span>
          </div>
        )}
        {isVideo ? (
          config.postFeed.autoplay ? (
            <video
              src={item.media_url}
              poster={item.thumbnail_url || undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : item.thumbnail_url ? (
            <img
              loading="lazy"
              src={item.thumbnail_url}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              alt="Instagram post"
            />
          ) : item.media_url ? (
            <video
              src={item.media_url}
              muted
              playsInline
              preload="metadata"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : null
        ) : item.media_url ? (
          <img
            loading="lazy"
            src={item.media_url}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            alt="Instagram post"
          />
        ) : null}
        {isVideo && (
          <div className="media-icon-badge" style={{ position: "absolute", top: "8px", right: "8px", zIndex: 10 }}>
            <span className="ai-type-badge-pill">
              <VideoMediaIcon />
              <span>{rawType === "REEL" ? "REEL" : "VIDEO"}</span>
            </span>
          </div>
        )}
        {isAlbum && (
          <div className="media-icon-badge" style={{ position: "absolute", top: "8px", right: "8px", zIndex: 10 }}>
            <span className="ai-type-badge-pill">
              <CarouselMediaIcon />
              <span>GALLERY</span>
            </span>
          </div>
        )}
        {config.postFeed.metrics && (
          <div className="media-metrics">
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Icon source={HeartIcon} tone="inherit" />
              <span>{item.like_count ?? "0"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Icon source={ChatIcon} tone="inherit" />
              <span>{item.comments_count ?? "0"}</span>
            </div>
          </div>
        )}
        {config.postFeed.showInstagramIcon !== false && (
          <div className="ai-ig-icon" style={{ color: "white" }}>
            <InstagramIcon />
          </div>
        )}
        <div className="hover-card-overlay" />
      </div>
    );
  };

  const renderCarouselCard = (item, i) => (
    <div key={i} className="carousel-item">
      {renderMediaCard(item, i)}
    </div>
  );

  const renderPromoStoryItem = () => {
    const s = config.stories;
    const ringColor = s.ringColor || "#e1306c";
    const promoLabel = s.promoLabel || "Get 10% Off";

    return (
      <div
        key="promo-story"
        className="ai-story-item ai-promo-item"
        onClick={() => setSelectedPost({ isPromo: true })}
        style={{
          flexShrink: 0,
          width: "72px",
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        <div
          className="ai-story-ring-wrapper"
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            padding: "2px",
            border: s.activeRing ? "none" : `2px solid ${ringColor}`,
            background: "white",
            margin: "0 auto",
            position: "relative",
          }}
        >
          {s.activeRing && (
            <svg
              className={`ai-story-ring-svg ${s.pulseRing ? "ai-story-ring-pulse" : ""}`}
              viewBox="0 0 100 100"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                animation: "rotateRing 5s linear infinite",
                pointerEvents: "none",
              }}
            >
              <circle cx="50" cy="50" r="47.5" fill="none" stroke={ringColor} strokeWidth="5" strokeDasharray="8 4" />
            </svg>
          )}
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              overflow: "hidden",
              background: "linear-gradient(135deg, #e1306c 0%, #c13584 50%, #f77737 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        </div>
        <div style={{ marginTop: "4px" }}>
          <span
            className="ai-promo-pill"
            style={{
              display: "inline-block",
              padding: "2px 6px",
              border: `1.5px solid ${ringColor}`,
              color: ringColor,
              fontSize: "9px",
              fontWeight: "700",
              borderRadius: "10px",
              whiteSpace: "nowrap",
              background: "white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
            }}
          >
            {promoLabel}
          </span>
        </div>
      </div>
    );
  };

  const renderStoryItem = (item, i) => {
    const s = config.stories;
    const ringColor = s.ringColor || "#e1306c";
    const rawType = (item.media_type || "").toUpperCase();
    const isVideo = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));
    const rawLabel = item.caption ? item.caption.split(/\s+/)[0] : `Story ${i + 1}`;
    const cleanLabel = rawLabel.replace(/[:,\.\-\s]+$/, "");

    return (
      <div
        key={item.id || i}
        className="ai-story-item"
        onClick={() => setSelectedPost(item)}
        style={{
          flexShrink: 0,
          width: "66px",
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        <div
          className="ai-story-ring-wrapper"
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            padding: "2px",
            border: s.activeRing ? "none" : `2px solid ${ringColor}`,
            background: "white",
            margin: "0 auto",
            position: "relative",
          }}
        >
          {s.activeRing && (
            <svg
              className={`ai-story-ring-svg ${s.pulseRing ? "ai-story-ring-pulse" : ""}`}
              viewBox="0 0 100 100"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                animation: "rotateRing 5s linear infinite",
                pointerEvents: "none",
              }}
            >
              <circle cx="50" cy="50" r="47.5" fill="none" stroke={ringColor} strokeWidth="5" strokeDasharray="8 4" />
            </svg>
          )}
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              overflow: "hidden",
              background: "#f1f5f9",
              position: "relative",
              zIndex: 1,
            }}
          >
            {isVideo ? (
              <video
                src={item.media_url}
                poster={item.thumbnail_url || undefined}
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <img
                src={item.media_url || item.thumbnail_url}
                alt="Story"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
        </div>
        {s.showLabels && (
          <div
            style={{
              marginTop: "4px",
              fontSize: "10px",
              fontWeight: "500",
              color: "#1e293b",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {cleanLabel}
          </div>
        )}
      </div>
    );
  };

  const renderFollowButton = () => {
    const handle = (instaData?.username || config.instagramHandle || "").replace("@", "").trim();
    if (!handle) return null;
    return (
      <div style={{ textAlign: "center", marginTop: "16px", marginBottom: "8px" }}>
        <a
          href={`https://instagram.com/${handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ai-follow-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)",
            color: "#ffffff",
            fontWeight: "700",
            fontSize: "11px",
            textDecoration: "none",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
          <span>Follow on Instagram</span>
        </a>
      </div>
    );
  };

  return (
    <Page
      title="AI Instafeed Expert"
      subtitle="Showcase your shoppable Instagram feed & stories directly on your Shopify storefront"
      badge={<Badge tone={isPaid ? "success" : "info"}>{isPaid ? planName : "Free Plan"}</Badge>}
      primaryAction={{
        content: "Customize in Store",
        icon: StoreIcon,
        disabled: !isConnected,
        onAction: () => {
          setIsSetupExpanded(true);
          setTimeout(() => {
            const card = document.getElementById("store-setup-status-card");
            if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 100);
        },
      }}
      secondaryActions={[
        {
          content: isPaid ? "Manage Plan" : "Upgrade to Pro",
          icon: StarIcon,
          onAction: () => navigate("/app/plans"),
        },
        {
          content: "Setup Guide",
          onAction: () => navigate("/app/guide"),
        },
      ]}
    >
      <BlockStack gap="500">
        {/* ── 1. Connect Instagram Account Card ── */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="300" blockAlign="center">
                <Text variant="headingMd" as="h2">
                  1. Connect Your Instagram Account
                </Text>
                {isConnected ? (
                  <Badge tone="success" progress="complete">
                    Linked to @{instaData?.username || config.instagramHandle}
                  </Badge>
                ) : (
                  <Badge tone="critical">Account Unlinked</Badge>
                )}
              </InlineStack>
              <Button
                variant="plain"
                icon={isConnectExpanded ? ChevronUpIcon : ChevronDownIcon}
                onClick={() => setIsConnectExpanded(!isConnectExpanded)}
                accessibilityLabel="Toggle Connect Section"
              />
            </InlineStack>

            <Collapsible open={isConnectExpanded} id="connect-account-collapsible">
              <BlockStack gap="300">
                <Text variant="bodyMd" tone="subdued">
                  Seamlessly sync your Instagram feed to your Shopify storefront. Enter your public Business or Creator username or profile URL to begin.
                </Text>

                <InlineStack gap="300" blockAlign="start">
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Instagram Username or Profile URL"
                      labelHidden
                      value={config.instagramHandle}
                      onChange={(val) => {
                        let parsed = val;
                        if (parsed.includes("instagram.com/")) {
                          try {
                            const url = new URL(parsed.startsWith("http") ? parsed : `https://${parsed}`);
                            const parts = url.pathname.split("/").filter(Boolean);
                            if (parts.length > 0) parsed = parts[0];
                          } catch {
                            const parts = parsed.replace(/\/$/, "").split("/");
                            parsed = parts[parts.length - 1].split("?")[0];
                          }
                        }
                        parsed = parsed.replace("@", "").split("?")[0].trim();
                        setConfig((prev) => ({ ...prev, instagramHandle: parsed }));
                        setConnectError(null);
                      }}
                      placeholder="e.g. yourbrand or instagram.com/yourbrand"
                      autoComplete="off"
                      prefix={<Icon source={InstagramIcon} />}
                      error={errors.instagramHandle}
                    />
                  </div>

                  <ButtonGroup>
                    {isConnected && (
                      <Button
                        icon={RefreshIcon}
                        loading={isSyncing}
                        onClick={() => {
                          const fd = new FormData();
                          fd.append("handle", config.instagramHandle);
                          fetcher.submit(fd, { method: "post" });
                        }}
                      >
                        Re-sync
                      </Button>
                    )}
                    <Button
                      variant={isConnected ? "secondary" : "primary"}
                      tone={isConnected ? "critical" : undefined}
                      icon={isConnected ? XIcon : LinkIcon}
                      loading={isSyncing}
                      onClick={() => {
                        if (isConnected) {
                          handleDisconnect();
                        } else {
                          if (!config.instagramHandle.trim()) {
                            shopify?.toast?.show("Please enter an Instagram handle", { isError: true });
                            return;
                          }
                          const fd = new FormData();
                          fd.append("handle", config.instagramHandle);
                          fetcher.submit(fd, { method: "post" });
                        }
                      }}
                    >
                      {isConnected ? "Disconnect" : "Connect & Sync All"}
                    </Button>
                  </ButtonGroup>
                </InlineStack>

                {connectError && !isSyncing && (
                  <Banner tone="critical" onDismiss={() => setConnectError(null)}>
                    {linkifyText(connectError)}
                  </Banner>
                )}

                {isConnected && instaData && (
                  <Banner tone="success">
                    <InlineStack gap="400" wrap>
                      <span>
                        <strong>{instaData.media?.data?.length || 0}</strong> posts stored
                      </span>
                      {instaData._totalPages && (
                        <span>
                          <strong>{instaData._totalPages}</strong> page
                          {instaData._totalPages > 1 ? "s" : ""} crawled
                        </span>
                      )}
                      {instaData._crawledAt && (
                        <span>
                          Last synced: <strong>{new Date(instaData._crawledAt).toLocaleString()}</strong>
                        </span>
                      )}
                      <span>✓ 0 API calls per storefront visit</span>
                    </InlineStack>
                  </Banner>
                )}

                {!connectError && !isConnected && (
                  <Text variant="bodySm" tone="subdued">
                    Must be a <strong>public Instagram Business or Creator account</strong>.{" "}
                    <a
                      href="https://help.instagram.com/502981923235522/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "inherit", textDecoration: "underline" }}
                    >
                      How to switch account type
                    </a>
                  </Text>
                )}
              </BlockStack>
            </Collapsible>
          </BlockStack>
        </Card>

        {/* ── 2. Store Setup Status Card ── */}
        {isConnected && (
          <div id="store-setup-status-card">
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center" wrap>
                  <InlineStack gap="300" blockAlign="center">
                    <Text variant="headingMd" as="h2">
                      2. Store Setup Status
                    </Text>
                    <Badge tone={isSetupComplete ? "success" : "attention"}>
                      {setupProgress} / 2 Steps Completed
                    </Badge>
                  </InlineStack>

                  <InlineStack gap="200" blockAlign="center">
                    {loaderData.allThemes?.length > 0 && (
                      <div style={{ minWidth: "180px" }}>
                        <Select
                          label="Target Theme"
                          labelHidden
                          options={loaderData.allThemes.map((t) => ({
                            label: `${t.isLive ? "🟢 " : ""}${t.name}${t.isLive ? " (Live)" : ""}`,
                            value: t.id,
                          }))}
                          value={loaderData.selectedThemeId || loaderData.themeId}
                          onChange={(newThemeId) => {
                            const searchParams = new URLSearchParams(window.location.search);
                            searchParams.set("selectedThemeId", newThemeId);
                            navigate(`?${searchParams.toString()}`, { replace: true });
                          }}
                        />
                      </div>
                    )}
                    <Button
                      variant="plain"
                      icon={isSetupExpanded ? ChevronUpIcon : ChevronDownIcon}
                      onClick={() => setIsSetupExpanded(!isSetupExpanded)}
                      accessibilityLabel="Toggle Setup Status"
                    />
                  </InlineStack>
                </InlineStack>

                <ProgressBar progress={setupProgress === 2 ? 100 : setupProgress === 1 ? 50 : 0} size="small" tone={isSetupComplete ? "success" : "highlight"} />

                <Collapsible open={isSetupExpanded} id="store-setup-collapsible">
                  <BlockStack gap="300">
                    {/* Step 1: Main Ext */}
                    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                      <InlineStack align="space-between" blockAlign="center" wrap>
                        <InlineStack gap="300" blockAlign="center">
                          <Badge tone={loaderData.dynamicAppEmbedEnabled ? "success" : "subdued"}>
                            {loaderData.dynamicAppEmbedEnabled ? "✓ Active" : "Step 1"}
                          </Badge>
                          <div>
                            <Text variant="bodyMd" fontWeight="semibold">
                              Enable App Embed Extension
                            </Text>
                            <Text variant="bodySm" tone="subdued">
                              Required to load widget scripts in your theme without slowing down pages.
                            </Text>
                          </div>
                        </InlineStack>
                        <Button
                          variant={loaderData.dynamicAppEmbedEnabled ? "secondary" : "primary"}
                          icon={ExternalIcon}
                          onClick={() => {
                            const url = `https://${loaderData.shop}/admin/themes/${loaderData.themeId}/editor?context=apps&activateAppId=${loaderData.clientId}/app-embed&activateAppEmbed=${loaderData.clientId}/app-embed`;
                            window.open(url, "_blank");
                            const newConfig = { ...config, appSetup: { ...config.appSetup, mainExt: true } };
                            setConfig(newConfig);
                            const fd = new FormData();
                            fd.append("config", JSON.stringify(newConfig));
                            saveFetcher.submit(fd, { method: "post" });
                          }}
                        >
                          {loaderData.dynamicAppEmbedEnabled ? "App Embed Enabled" : "Enable in Theme"}
                        </Button>
                      </InlineStack>
                    </Box>

                    {/* Step 2: Sections */}
                    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                      <InlineStack align="space-between" blockAlign="center" wrap>
                        <InlineStack gap="300" blockAlign="center">
                          <Badge tone={loaderData.dynamicSections?.grid || loaderData.dynamicSections?.story ? "success" : "subdued"}>
                            {loaderData.dynamicSections?.grid || loaderData.dynamicSections?.story ? "✓ Active" : "Step 2"}
                          </Badge>
                          <div>
                            <Text variant="bodyMd" fontWeight="semibold">
                              Add Feed Grid or Story Section
                            </Text>
                            <Text variant="bodySm" tone="subdued">
                              Insert the Instagram gallery block into your storefront pages.
                            </Text>
                          </div>
                        </InlineStack>
                        <ButtonGroup>
                          <Button
                            variant={loaderData.dynamicSections?.grid ? "secondary" : "primary"}
                            icon={ExternalIcon}
                            onClick={() => {
                              const url = `https://${loaderData.shop}/admin/themes/${loaderData.themeId}/editor?addAppBlockId=${loaderData.clientId}/feed-grid&target=newAppsSection`;
                              window.open(url, "_blank");
                              const newConfig = { ...config, appSetup: { ...config.appSetup, sectionExt: true } };
                              setConfig(newConfig);
                              const fd = new FormData();
                              fd.append("config", JSON.stringify(newConfig));
                              saveFetcher.submit(fd, { method: "post" });
                            }}
                          >
                            {loaderData.dynamicSections?.grid ? "Grid Added" : "Add Feed Grid"}
                          </Button>
                          <Button
                            variant={loaderData.dynamicSections?.story ? "secondary" : "primary"}
                            icon={ExternalIcon}
                            onClick={() => {
                              const url = `https://${loaderData.shop}/admin/themes/${loaderData.themeId}/editor?addAppBlockId=${loaderData.clientId}/story-layout&target=newAppsSection`;
                              window.open(url, "_blank");
                              const newConfig = { ...config, appSetup: { ...config.appSetup, sectionExt: true } };
                              setConfig(newConfig);
                              const fd = new FormData();
                              fd.append("config", JSON.stringify(newConfig));
                              saveFetcher.submit(fd, { method: "post" });
                            }}
                          >
                            {loaderData.dynamicSections?.story ? "Story Added" : "Add Story Layout"}
                          </Button>
                        </ButtonGroup>
                      </InlineStack>
                    </Box>
                  </BlockStack>
                </Collapsible>
              </BlockStack>
            </Card>
          </div>
        )}

        {/* ── 3. Main Dashboard Layout (Configurator & Live Preview) ── */}
        {!isConnected ? (
          <Card>
            <Box padding="800">
              <BlockStack gap="400" align="center" inlineAlign="center">
                <Icon source={InstagramIcon} tone="subdued" />
                <Text variant="headingLg" as="h3">
                  Connect Instagram to Customize
                </Text>
                <Text variant="bodyMd" tone="subdued" alignment="center">
                  Link your Instagram account above to unlock custom typography presets, adjust layouts, select/hide posts, and preview your live feed instantly.
                </Text>
                <Button
                  variant="primary"
                  icon={LinkIcon}
                  onClick={() => {
                    setIsConnectExpanded(true);
                    const inputEl = document.querySelector("input");
                    if (inputEl) {
                      inputEl.focus();
                      inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }}
                >
                  Connect Account Now
                </Button>
              </BlockStack>
            </Box>
          </Card>
        ) : (
          <Layout>
            {/* ── Left Column: Configurator Tabs & Settings ── */}
            <Layout.Section>
              <Card padding="0">
                <Tabs
                  tabs={[
                    { id: "feed-grid-tab", content: "Feed Grid Settings", accessibilityLabel: "Feed Grid Settings" },
                    { id: "stories-tab", content: "Story & Layouts", accessibilityLabel: "Story & Layouts" },
                  ]}
                  selected={selectedTabIndex}
                  onSelect={setSelectedTabIndex}
                />

                <Box padding="400">
                  {activeTab === "post" ? (
                    <BlockStack gap="400">
                      {/* Media Filter */}
                      <Card>
                        <BlockStack gap="200">
                          <Text variant="headingSm" as="h3">
                            Show Media Type
                          </Text>
                          <ButtonGroup variant="segmented">
                            <Button
                              pressed={config.postFeed.mediaTypeFilter === "all" || !config.postFeed.mediaTypeFilter}
                              onClick={() => updateConfig("postFeed", "mediaTypeFilter", "all")}
                            >
                              All Media
                            </Button>
                            <Button
                              pressed={config.postFeed.mediaTypeFilter === "images"}
                              onClick={() => updateConfig("postFeed", "mediaTypeFilter", "images")}
                            >
                              Images Only
                            </Button>
                            <Button
                              pressed={config.postFeed.mediaTypeFilter === "videos"}
                              onClick={() => updateConfig("postFeed", "mediaTypeFilter", "videos")}
                            >
                              Videos & Reels
                            </Button>
                          </ButtonGroup>
                        </BlockStack>
                      </Card>

                      {/* Feature Modules */}
                      <Card>
                        <BlockStack gap="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text variant="headingSm" as="h3">
                              Feature Modules
                            </Text>
                            <Button
                              variant="plain"
                              icon={isPostModulesExpanded ? ChevronUpIcon : ChevronDownIcon}
                              onClick={() => setIsPostModulesExpanded(!isPostModulesExpanded)}
                            />
                          </InlineStack>

                          <Collapsible open={isPostModulesExpanded} id="post-modules-collapsible">
                            <BlockStack gap="300">
                              <Text variant="bodySm" tone="subdued" fontWeight="bold">
                                STANDARD MODULES
                              </Text>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                                <Checkbox
                                  label="Profile Header"
                                  helpText="Show store bio & icon on storefront feed"
                                  checked={config.postFeed.header}
                                  onChange={(val) => updateConfig("postFeed", "header", val)}
                                />
                                <Checkbox
                                  label="Engagement Hub"
                                  helpText="Visualize likes & comments on hover"
                                  checked={config.postFeed.metrics}
                                  onChange={(val) => updateConfig("postFeed", "metrics", val)}
                                />
                                <Checkbox
                                  label="Smart Carousel"
                                  helpText="Display posts in an auto-swipe slider"
                                  checked={config.postFeed.carousel}
                                  onChange={(val) => updateConfig("postFeed", "carousel", val)}
                                />
                                <Checkbox
                                  label="Smart Autoplay"
                                  helpText="Preload and autoplay video/reel content"
                                  checked={config.postFeed.autoplay}
                                  onChange={(val) => updateConfig("postFeed", "autoplay", val)}
                                />
                                <Checkbox
                                  label="Modal Navigation"
                                  helpText="Show Prev/Next arrows in popup modal"
                                  checked={config.postFeed.modalNavigation}
                                  onChange={(val) => updateConfig("postFeed", "modalNavigation", val)}
                                />
                                <Checkbox
                                  label="Instagram Icon"
                                  helpText="Display Instagram branding badge on posts"
                                  checked={config.postFeed.showInstagramIcon !== false}
                                  onChange={(val) => updateConfig("postFeed", "showInstagramIcon", val)}
                                />
                              </div>

                              <Divider />

                              <InlineStack gap="200" blockAlign="center">
                                <Text variant="bodySm" tone="subdued" fontWeight="bold">
                                  AI & PRO MODULES
                                </Text>
                                <Badge tone="info">PRO</Badge>
                              </InlineStack>

                              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                                <Checkbox
                                  label="AI Smart Sorting"
                                  helpText="Sort feed dynamically by top engagement"
                                  checked={isPaid && config.postFeed.sortBy === "engaging"}
                                  disabled={!isPaid}
                                  onChange={(val) => {
                                    if (!isPaid) {
                                      shopify?.toast?.show("AI Smart Sorting is a PRO feature", { isError: true });
                                      navigate("/app/plans");
                                      return;
                                    }
                                    updateConfig("postFeed", "sortBy", val ? "engaging" : "latest");
                                  }}
                                />
                                <Checkbox
                                  label="AI Sentiment Moderation"
                                  helpText="Automatically hide posts with spam/negative comments"
                                  checked={isPaid && !!config.aiCommentModeration}
                                  disabled={!isPaid}
                                  onChange={(val) => {
                                    if (!isPaid) {
                                      shopify?.toast?.show("AI Moderation is a PRO feature", { isError: true });
                                      navigate("/app/plans");
                                      return;
                                    }
                                    setConfig((prev) => ({ ...prev, aiCommentModeration: val }));
                                  }}
                                />
                                <Checkbox
                                  label="Infinite Paging"
                                  helpText="Endless scrolling on page load"
                                  checked={isPaid && !!config.postFeed.load}
                                  disabled={!isPaid}
                                  onChange={(val) => {
                                    if (!isPaid) {
                                      shopify?.toast?.show("Infinite paging is a PRO feature", { isError: true });
                                      navigate("/app/plans");
                                      return;
                                    }
                                    updateConfig("postFeed", "load", val);
                                  }}
                                />
                                <Checkbox
                                  label="Remove Watermark"
                                  helpText="Hide the 'By BOOST STAR' brand watermark"
                                  checked={isPaid && !!config.postFeed.removeWatermark}
                                  disabled={!isPaid}
                                  onChange={(val) => {
                                    if (!isPaid) {
                                      shopify?.toast?.show("Remove watermark is a PRO feature", { isError: true });
                                      navigate("/app/plans");
                                      return;
                                    }
                                    updateConfig("postFeed", "removeWatermark", val);
                                  }}
                                />
                                <Checkbox
                                  label="Manual Hide Mode"
                                  helpText="Click posts in the preview to hide/unhide"
                                  checked={isPaid && isHideMode}
                                  disabled={!isPaid}
                                  onChange={(val) => {
                                    if (!isPaid) {
                                      shopify?.toast?.show("Hide mode is a PRO feature", { isError: true });
                                      navigate("/app/plans");
                                      return;
                                    }
                                    setIsHideMode(val);
                                    if (val) {
                                      shopify?.toast?.show("👆 Hide Mode ON — Click any post in the preview to hide it");
                                    } else {
                                      shopify?.toast?.show("Hide Mode turned off");
                                    }
                                  }}
                                />
                              </div>
                            </BlockStack>
                          </Collapsible>
                        </BlockStack>
                      </Card>

                      {/* Layout Architecture */}
                      <Card>
                        <BlockStack gap="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text variant="headingSm" as="h3">
                              Layout & Grid Architecture
                            </Text>
                            <Button
                              variant="plain"
                              icon={isPostLayoutExpanded ? ChevronUpIcon : ChevronDownIcon}
                              onClick={() => setIsPostLayoutExpanded(!isPostLayoutExpanded)}
                            />
                          </InlineStack>

                          <Collapsible open={isPostLayoutExpanded} id="post-layout-collapsible">
                            <BlockStack gap="300">
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <Select
                                  label="Desktop Columns"
                                  options={[
                                    { label: "3 Columns", value: "3" },
                                    { label: "4 Columns", value: "4" },
                                    { label: `5 Columns ${!isPaid ? "(PRO)" : ""}`, value: "5" },
                                    { label: `6 Columns ${!isPaid ? "(PRO)" : ""}`, value: "6" },
                                  ]}
                                  value={String(config.postFeed.desktopColumns)}
                                  onChange={(val) => {
                                    const num = parseInt(val);
                                    if (!isPaid && num > 4) {
                                      shopify?.toast?.show("Unlock PRO for more than 4 columns", { isError: true });
                                      navigate("/app/plans");
                                      return;
                                    }
                                    updateConfig("postFeed", "desktopColumns", num);
                                  }}
                                />
                                <Select
                                  label="Mobile Columns"
                                  options={[
                                    { label: "1 Column", value: "1" },
                                    { label: "2 Columns", value: "2" },
                                    { label: "3 Columns", value: "3" },
                                  ]}
                                  value={String(config.postFeed.mobileColumns)}
                                  onChange={(val) => updateConfig("postFeed", "mobileColumns", parseInt(val))}
                                />
                              </div>

                              {!config.postFeed.load && (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                  <Select
                                    label="Desktop Total Posts"
                                    options={[4, 6, 8, 12, 16, 20, 24].map((n) => ({
                                      label: `${n} Posts ${!isPaid && n > 12 ? "(PRO)" : ""}`,
                                      value: String(n),
                                    }))}
                                    value={String(config.postFeed.desktopLimit || 8)}
                                    onChange={(val) => {
                                      const num = parseInt(val);
                                      if (!isPaid && num > 12) {
                                        shopify?.toast?.show("Unlock PRO for more than 12 posts", { isError: true });
                                        navigate("/app/plans");
                                        return;
                                      }
                                      updateConfig("postFeed", "desktopLimit", num);
                                    }}
                                  />
                                  <Select
                                    label="Mobile Total Posts"
                                    options={[3, 4, 6, 8, 12].map((n) => ({
                                      label: `${n} Posts`,
                                      value: String(n),
                                    }))}
                                    value={String(config.postFeed.mobileLimit || 4)}
                                    onChange={(val) => updateConfig("postFeed", "mobileLimit", parseInt(val))}
                                  />
                                </div>
                              )}

                              <RangeSlider
                                label={`Visual Gap (${config.postFeed.gap}px)`}
                                value={config.postFeed.gap}
                                min={0}
                                max={40}
                                onChange={(val) => updateConfig("postFeed", "gap", val)}
                              />

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <RangeSlider
                                  label={`Top Padding (${config.postFeed.paddingTop}px)`}
                                  value={config.postFeed.paddingTop}
                                  min={0}
                                  max={100}
                                  onChange={(val) => updateConfig("postFeed", "paddingTop", val)}
                                />
                                <RangeSlider
                                  label={`Bottom Padding (${config.postFeed.paddingBottom}px)`}
                                  value={config.postFeed.paddingBottom}
                                  min={0}
                                  max={100}
                                  onChange={(val) => updateConfig("postFeed", "paddingBottom", val)}
                                />
                              </div>

                              <Select
                                label="Image Aspect Ratio"
                                options={[
                                  { label: "Auto (Original)", value: "auto" },
                                  { label: "1:1 (Square)", value: "1/1" },
                                  { label: "3:4 (Portrait)", value: "3/4" },
                                  { label: "3:2 (Landscape)", value: "3/2" },
                                  { label: "9:16 (Story)", value: "9/16" },
                                ]}
                                value={config.postFeed.aspectRatio || "auto"}
                                onChange={(val) => updateConfig("postFeed", "aspectRatio", val)}
                              />
                            </BlockStack>
                          </Collapsible>
                        </BlockStack>
                      </Card>

                      {/* Branding & Typography */}
                      <Card>
                        <BlockStack gap="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text variant="headingSm" as="h3">
                              Branding & Typography
                            </Text>
                            <Button
                              variant="plain"
                              icon={isPostBrandingExpanded ? ChevronUpIcon : ChevronDownIcon}
                              onClick={() => setIsPostBrandingExpanded(!isPostBrandingExpanded)}
                            />
                          </InlineStack>

                          <Collapsible open={isPostBrandingExpanded} id="post-branding-collapsible">
                            <BlockStack gap="300">
                              <Select
                                label="Layout Alignment"
                                options={[
                                  { label: "Centered", value: "center" },
                                  { label: "Left Aligned", value: "left" },
                                  { label: "Right Aligned", value: "right" },
                                ]}
                                value={config.postFeed.alignment}
                                onChange={(val) => updateConfig("postFeed", "alignment", val)}
                              />

                              <Text variant="bodyMd" fontWeight="semibold">
                                Typography Presets
                              </Text>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                                {FEED_TYPOGRAPHY_PRESETS.map((preset) => {
                                  const isSelected = isPresetMatch(config.postFeed, preset);
                                  return (
                                    <Box
                                      key={preset.name}
                                      padding="200"
                                      borderWidth="025"
                                      borderColor={isSelected ? "border-brand" : "border"}
                                      borderRadius="200"
                                      background={isSelected ? "bg-surface-brand-active" : "bg-surface-secondary"}
                                      onClick={() => {
                                        setConfig((prev) => ({
                                          ...prev,
                                          postFeed: {
                                            ...prev.postFeed,
                                            heading: preset.textHeading,
                                            subheading: preset.textSubheading,
                                            typography: {
                                              heading: { ...preset.heading },
                                              subheading: { ...preset.subheading },
                                            },
                                          },
                                        }));
                                      }}
                                      style={{ cursor: "pointer" }}
                                    >
                                      <Text variant="bodySm" fontWeight="bold">
                                        {preset.name}
                                      </Text>
                                      <Text variant="bodyXs" tone="subdued">
                                        {preset.desc}
                                      </Text>
                                    </Box>
                                  );
                                })}
                              </div>

                              <TextField
                                label="Feed Heading"
                                value={config.postFeed.heading}
                                onChange={(val) => updateConfig("postFeed", "heading", val)}
                                autoComplete="off"
                              />

                              <TextField
                                label="Feed Subheading"
                                value={config.postFeed.subheading}
                                onChange={(val) => updateConfig("postFeed", "subheading", val)}
                                autoComplete="off"
                              />
                            </BlockStack>
                          </Collapsible>
                        </BlockStack>
                      </Card>
                    </BlockStack>
                  ) : (
                    /* ── Stories & Layouts Settings ── */
                    <BlockStack gap="400">
                      <Card>
                        <BlockStack gap="200">
                          <Text variant="headingSm" as="h3">
                            Show Media Type
                          </Text>
                          <ButtonGroup variant="segmented">
                            <Button
                              pressed={config.stories.mediaTypeFilter === "all" || !config.stories.mediaTypeFilter}
                              onClick={() => updateConfig("stories", "mediaTypeFilter", "all")}
                            >
                              All Media
                            </Button>
                            <Button
                              pressed={config.stories.mediaTypeFilter === "images"}
                              onClick={() => updateConfig("stories", "mediaTypeFilter", "images")}
                            >
                              Images Only
                            </Button>
                            <Button
                              pressed={config.stories.mediaTypeFilter === "videos"}
                              onClick={() => updateConfig("stories", "mediaTypeFilter", "videos")}
                            >
                              Videos & Reels
                            </Button>
                          </ButtonGroup>
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text variant="headingSm" as="h3">
                              Story Highlight Modules
                            </Text>
                            <Button
                              variant="plain"
                              icon={isStoryModulesExpanded ? ChevronUpIcon : ChevronDownIcon}
                              onClick={() => setIsStoryModulesExpanded(!isStoryModulesExpanded)}
                            />
                          </InlineStack>

                          <Collapsible open={isStoryModulesExpanded} id="story-modules-collapsible">
                            <BlockStack gap="300">
                              <Checkbox
                                label="Enable Stories Highlight Widget"
                                helpText="Render circular story circles at the top of your page"
                                checked={config.stories.enable}
                                onChange={(val) => updateConfig("stories", "enable", val)}
                              />
                              <Checkbox
                                label="Show Highlight Labels"
                                helpText="Display post titles under story circles"
                                checked={config.stories.showLabels}
                                onChange={(val) => updateConfig("stories", "showLabels", val)}
                              />
                              <Checkbox
                                label="Enable Discount Promo Offer"
                                helpText="Promote a coupon popup when merchants open stories"
                                checked={config.stories.promoEnable}
                                onChange={(val) => updateConfig("stories", "promoEnable", val)}
                              />
                              {config.stories.promoEnable && (
                                <TextField
                                  label="Promo Offer Label"
                                  value={config.stories.promoLabel}
                                  onChange={(val) => updateConfig("stories", "promoLabel", val)}
                                  autoComplete="off"
                                />
                              )}
                              <Checkbox
                                label="Smart Carousel Swiper"
                                helpText="Auto-swipe highlight circles horizontally"
                                checked={config.stories.carousel}
                                onChange={(val) => updateConfig("stories", "carousel", val)}
                              />
                            </BlockStack>
                          </Collapsible>
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text variant="headingSm" as="h3">
                              Story Branding & Typography
                            </Text>
                            <Button
                              variant="plain"
                              icon={isStoryBrandingExpanded ? ChevronUpIcon : ChevronDownIcon}
                              onClick={() => setIsStoryBrandingExpanded(!isStoryBrandingExpanded)}
                            />
                          </InlineStack>

                          <Collapsible open={isStoryBrandingExpanded} id="story-branding-collapsible">
                            <BlockStack gap="300">
                              <Checkbox
                                label="Show Story Header Title"
                                checked={config.stories.showHeader}
                                onChange={(val) => updateConfig("stories", "showHeader", val)}
                              />
                              {config.stories.showHeader && (
                                <>
                                  <TextField
                                    label="Story Heading"
                                    value={config.stories.heading}
                                    onChange={(val) => updateConfig("stories", "heading", val)}
                                    autoComplete="off"
                                  />
                                  <TextField
                                    label="Story Subtext"
                                    value={config.stories.subheading}
                                    onChange={(val) => updateConfig("stories", "subheading", val)}
                                    autoComplete="off"
                                  />
                                </>
                              )}
                              <RangeSlider
                                label={`Top Padding (${config.stories.paddingTop}px)`}
                                value={config.stories.paddingTop}
                                min={0}
                                max={100}
                                onChange={(val) => updateConfig("stories", "paddingTop", val)}
                              />
                              <RangeSlider
                                label={`Bottom Padding (${config.stories.paddingBottom}px)`}
                                value={config.stories.paddingBottom}
                                min={0}
                                max={100}
                                onChange={(val) => updateConfig("stories", "paddingBottom", val)}
                              />
                            </BlockStack>
                          </Collapsible>
                        </BlockStack>
                      </Card>
                    </BlockStack>
                  )}
                </Box>
              </Card>
            </Layout.Section>

            {/* ── Right Column: Live Storefront Preview ── */}
            <Layout.Section variant="oneThird">
              <div style={{ position: "sticky", top: "20px" }}>
                <Card>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingSm" as="h3">
                        Live Preview
                      </Text>
                      <ButtonGroup variant="segmented">
                        <Button
                          pressed={previewDevice === "mobile"}
                          icon={MobileIcon}
                          onClick={() => setPreviewDevice("mobile")}
                          accessibilityLabel="Mobile View"
                        />
                        <Button
                          pressed={previewDevice === "desktop"}
                          icon={DesktopIcon}
                          onClick={() => setPreviewDevice("desktop")}
                          accessibilityLabel="Desktop View"
                        />
                      </ButtonGroup>
                    </InlineStack>

                    {isHideMode && activeTab === "post" && (
                      <Banner tone="info">
                        <strong>Hide Mode Active:</strong> Click any post in the preview below to toggle hidden status.
                      </Banner>
                    )}

                    {/* Mobile Frame Simulator */}
                    {previewDevice === "mobile" ? (
                      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                        <div
                          style={{
                            width: "280px",
                            height: "560px",
                            background: "white",
                            borderRadius: "36px",
                            border: "10px solid #1e293b",
                            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
                            position: "relative",
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              height: "36px",
                              padding: "10px 16px 0",
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "10px",
                              fontWeight: "700",
                              background: "white",
                            }}
                          >
                            <span>9:41</span>
                            <div>📶 🔋</div>
                          </div>

                          <div
                            style={{ height: "calc(100% - 36px)", overflowY: "auto", paddingBottom: "20px" }}
                            onScroll={(e) => handleScroll(e, "vertical")}
                          >
                            {activeTab === "post" ? (
                              <div
                                style={{
                                  paddingTop: `${config.postFeed.paddingTop}px`,
                                  paddingBottom: `${config.postFeed.paddingBottom}px`,
                                }}
                              >
                                {config.postFeed.header && (config.postFeed.heading?.trim() || config.postFeed.subheading?.trim()) && (
                                  <div style={{ padding: "8px 12px 0", textAlign: config.postFeed.alignment }}>
                                    {config.postFeed.heading?.trim() && (
                                      <h4
                                        style={{
                                          fontSize: `${config.postFeed.typography.heading.size}px`,
                                          fontWeight: config.postFeed.typography.heading.weight,
                                          color: config.postFeed.typography.heading.color,
                                          margin: "0 0 4px 0",
                                        }}
                                      >
                                        {formatDynamicAccountText(config.postFeed.heading)}
                                      </h4>
                                    )}
                                    {config.postFeed.subheading?.trim() && (
                                      <p
                                        style={{
                                          fontSize: `${config.postFeed.typography.subheading.size}px`,
                                          color: config.postFeed.typography.subheading.color,
                                          margin: 0,
                                        }}
                                      >
                                        {formatDynamicAccountText(config.postFeed.subheading)}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {config.postFeed.carousel ? (
                                  <div className="carousel-wrapper" style={{ padding: `${config.postFeed.gap}px 0`, position: "relative" }}>
                                    <button
                                      className="carousel-nav prev"
                                      onClick={() => scrollCarousel(mobileCarouselRef, "prev")}
                                      style={{ width: "24px", height: "24px", left: "4px" }}
                                    >
                                      <Icon source={ChevronLeftIcon} />
                                    </button>
                                    <div
                                      className="carousel-container"
                                      ref={mobileCarouselRef}
                                      style={{
                                        padding: `0 ${config.postFeed.gap}px`,
                                        "--carousel-gap": `${config.postFeed.gap}px`,
                                        "--carousel-item-width": `calc((100% - ${(config.postFeed.mobileColumns - 1) * config.postFeed.gap}px) / ${config.postFeed.mobileColumns})`,
                                      }}
                                    >
                                      {simulatedInfiniteMedia.map((item, i) => renderCarouselCard(item, i))}
                                    </div>
                                    <button
                                      className="carousel-nav next"
                                      onClick={() => scrollCarousel(mobileCarouselRef, "next")}
                                      style={{ width: "24px", height: "24px", right: "4px" }}
                                    >
                                      <Icon source={ChevronRightIcon} />
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: `repeat(${config.postFeed.mobileColumns}, 1fr)`,
                                      gap: `${config.postFeed.gap}px`,
                                      padding: `12px ${config.postFeed.gap}px`,
                                    }}
                                  >
                                    {simulatedInfiniteMedia.map((item, i) => renderMediaCard(item, i))}
                                  </div>
                                )}

                                {config.postFeed.showFollowButton !== false && renderFollowButton()}
                              </div>
                            ) : (
                              /* Story Preview */
                              <div
                                style={{
                                  paddingTop: `${config.stories.paddingTop}px`,
                                  paddingBottom: `${config.stories.paddingBottom}px`,
                                }}
                              >
                                {config.stories.showHeader && (
                                  <div style={{ padding: "8px 12px", textAlign: config.stories.alignment }}>
                                    <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "700" }}>
                                      {formatDynamicAccountText(config.stories.heading)}
                                    </h4>
                                    <p style={{ margin: 0, fontSize: "11px", color: "#6b7280" }}>
                                      {formatDynamicAccountText(config.stories.subheading)}
                                    </p>
                                  </div>
                                )}
                                <div style={{ display: "flex", gap: "8px", padding: "8px 10px", overflowX: "auto" }}>
                                  {config.stories.promoEnable !== false && renderPromoStoryItem()}
                                  {baseMedia.slice(0, 8).map((item, i) => renderStoryItem(item, i))}
                                </div>
                                {config.stories.showFollowButton === true && renderFollowButton()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Desktop Frame Simulator */
                      <div
                        style={{
                          width: "100%",
                          background: "white",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          padding: "16px",
                          overflowY: "auto",
                          maxHeight: "560px",
                        }}
                      >
                        {activeTab === "post" ? (
                          <div>
                            {config.postFeed.header && (
                              <div style={{ textAlign: config.postFeed.alignment, marginBottom: "12px" }}>
                                <h4
                                  style={{
                                    fontSize: `${config.postFeed.typography.heading.size}px`,
                                    fontWeight: config.postFeed.typography.heading.weight,
                                    color: config.postFeed.typography.heading.color,
                                    margin: "0 0 4px 0",
                                  }}
                                >
                                  {formatDynamicAccountText(config.postFeed.heading)}
                                </h4>
                                <p style={{ fontSize: `${config.postFeed.typography.subheading.size}px`, color: config.postFeed.typography.subheading.color, margin: 0 }}>
                                  {formatDynamicAccountText(config.postFeed.subheading)}
                                </p>
                              </div>
                            )}

                            {config.postFeed.carousel ? (
                              <div className="carousel-wrapper" style={{ padding: `${config.postFeed.gap}px 0`, position: "relative" }}>
                                <button
                                  className="carousel-nav prev"
                                  onClick={() => scrollCarousel(desktopCarouselRef, "prev")}
                                  style={{ width: "32px", height: "32px", left: "0px" }}
                                >
                                  <Icon source={ChevronLeftIcon} />
                                </button>
                                <div
                                  className="carousel-container"
                                  ref={desktopCarouselRef}
                                  style={{
                                    padding: `0 ${config.postFeed.gap}px`,
                                    "--carousel-gap": `${config.postFeed.gap}px`,
                                    "--carousel-item-width": `calc((100% - ${(config.postFeed.desktopColumns - 1) * config.postFeed.gap}px) / ${config.postFeed.desktopColumns})`,
                                  }}
                                >
                                  {simulatedInfiniteMedia.map((item, i) => renderCarouselCard(item, i))}
                                </div>
                                <button
                                  className="carousel-nav next"
                                  onClick={() => scrollCarousel(desktopCarouselRef, "next")}
                                  style={{ width: "32px", height: "32px", right: "0px" }}
                                >
                                  <Icon source={ChevronRightIcon} />
                                </button>
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: `repeat(${config.postFeed.desktopColumns}, 1fr)`,
                                  gap: `${config.postFeed.gap}px`,
                                }}
                              >
                                {simulatedInfiniteMedia.map((item, i) => renderMediaCard(item, i))}
                              </div>
                            )}

                            {config.postFeed.showFollowButton !== false && renderFollowButton()}
                          </div>
                        ) : (
                          <div style={{ textAlign: config.stories.alignment }}>
                            {config.stories.showHeader && (
                              <div style={{ marginBottom: "12px" }}>
                                <h4 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "700" }}>
                                  {formatDynamicAccountText(config.stories.heading)}
                                </h4>
                                <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
                                  {formatDynamicAccountText(config.stories.subheading)}
                                </p>
                              </div>
                            )}
                            <div style={{ display: "flex", gap: "12px", justifyContent: config.stories.alignment === "center" ? "center" : "flex-start", overflowX: "auto", padding: "8px 0" }}>
                              {config.stories.promoEnable !== false && renderPromoStoryItem()}
                              {baseMedia.slice(0, 10).map((item, i) => renderStoryItem(item, i))}
                            </div>
                            {config.stories.showFollowButton === true && renderFollowButton()}
                          </div>
                        )}
                      </div>
                    )}
                  </BlockStack>
                </Card>
              </div>
            </Layout.Section>
          </Layout>
        )}

        {/* ── High-Fidelity Instagram Modal Dialog ── */}
        {selectedPost && (
          <Modal
            open={Boolean(selectedPost)}
            onClose={() => setSelectedPost(null)}
            title={selectedPost.isPromo ? "Special Offer" : `@${instaData?.username || config.instagramHandle || "instagram"}`}
            size="large"
            primaryAction={{
              content: "Close",
              onAction: () => setSelectedPost(null),
            }}
          >
            <Modal.Section flush>
              {selectedPost.isPromo ? (
                /* Promo Modal */
                <div style={{ display: "flex", flexDirection: "row", minHeight: "260px", background: "white", borderRadius: "8px", overflow: "hidden" }}>
                  <div
                    style={{
                      flex: 1,
                      background: "linear-gradient(135deg, #e1306c 0%, #c13584 50%, #f77737 100%)",
                      color: "white",
                      padding: "32px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", padding: "14px", marginBottom: "12px" }}>
                      <Icon source={StarIcon} tone="inherit" />
                    </div>
                    <Text variant="headingLg" as="h3" tone="inherit">
                      SPECIAL OFFER
                    </Text>
                    <Text variant="bodySm" tone="inherit">
                      Exclusive Store Reward
                    </Text>
                  </div>
                  <div style={{ flex: 1.2, padding: "28px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <Text variant="headingMd" as="h3">
                      {config.stories.promoLabel || "Get 10% Off"}
                    </Text>
                    <Box paddingBlockStart="200" paddingBlockEnd="400">
                      <Text variant="bodyMd" tone="subdued">
                        {formatDynamicAccountText(
                          config.stories.promoDesc ||
                            "Take a screenshot of a product you wish to buy and tag us on Instagram for a 10% discount coupon code!"
                        )}
                      </Text>
                    </Box>
                    <Button
                      variant="primary"
                      fullWidth
                      url={`https://instagram.com/${(instaData?.username || config.instagramHandle || "").replace("@", "")}`}
                      target="_blank"
                    >
                      Open Instagram
                    </Button>
                  </div>
                </div>
              ) : (
                /* Authentic Instagram Lightbox Modal */
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    minHeight: "420px",
                    maxHeight: "80vh",
                    background: "white",
                    overflow: "hidden",
                  }}
                >
                  {/* Left Column: Media Viewport */}
                  <div
                    style={{
                      flex: 1.3,
                      background: "#000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      minHeight: "360px",
                      position: "relative",
                    }}
                  >
                    {(selectedPost.media_type || "").toUpperCase() === "VIDEO" ||
                    (selectedPost.media_type || "").toUpperCase() === "REEL" ||
                    (selectedPost.media_url &&
                      (selectedPost.media_url.toLowerCase().includes(".mp4") || selectedPost.media_url.toLowerCase().includes(".mov"))) ? (
                      <video
                        src={selectedPost.media_url}
                        poster={selectedPost.thumbnail_url || undefined}
                        autoPlay
                        loop
                        controls
                        playsInline
                        style={{ width: "100%", height: "100%", maxHeight: "500px", objectFit: "contain" }}
                      />
                    ) : (
                      <img
                        src={selectedPost.media_url}
                        alt="Instagram post"
                        style={{ width: "100%", height: "100%", maxHeight: "500px", objectFit: "contain" }}
                      />
                    )}
                  </div>

                  {/* Right Column: Instagram Profile & Details */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      background: "#fff",
                      borderLeft: "1px solid #e2e8f0",
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "14px 16px",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <InstagramIcon />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text variant="bodyMd" fontWeight="bold">
                          @{instaData?.username || config.instagramHandle || "account"}
                        </Text>
                        <Text variant="bodyXs" tone="subdued">
                          Instagram Post
                        </Text>
                      </div>
                    </div>

                    {/* Caption */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                      <Text variant="bodyMd">{selectedPost.caption || "Shop our featured Instagram style!"}</Text>
                      <div style={{ marginTop: "12px" }}>
                        <Text variant="bodyXs" tone="subdued">
                          POSTED ON INSTAGRAM
                        </Text>
                      </div>
                    </div>

                    {/* Action Bar & Footer */}
                    <div style={{ padding: "14px 16px", borderTop: "1px solid #f1f5f9" }}>
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="300">
                          <Text variant="bodySm" fontWeight="bold">
                            ❤️ {selectedPost.like_count || 0} Likes
                          </Text>
                          <Text variant="bodySm" fontWeight="bold">
                            💬 {selectedPost.comments_count || 0} Comments
                          </Text>
                        </InlineStack>
                        <Button
                          size="slim"
                          icon={ShareIcon}
                          onClick={() => {
                            const url =
                              selectedPost.permalink ||
                              `https://instagram.com/${(instaData?.username || config.instagramHandle || "").replace("@", "")}`;
                            if (navigator.clipboard?.writeText) {
                              navigator.clipboard.writeText(url);
                              shopify?.toast?.show("Post link copied to clipboard!");
                            }
                          }}
                        >
                          Share
                        </Button>
                      </InlineStack>

                      <Box paddingBlockStart="300">
                        <Button
                          variant="primary"
                          fullWidth
                          url={
                            selectedPost.permalink ||
                            `https://instagram.com/${(instaData?.username || config.instagramHandle || "").replace("@", "")}`
                          }
                          target="_blank"
                        >
                          View on Instagram
                        </Button>
                      </Box>
                    </div>
                  </div>
                </div>
              )}
            </Modal.Section>
          </Modal>
        )}

        {/* ── Footer ── */}
        <Box paddingBlock="600">
          <BlockStack gap="200" align="center" inlineAlign="center">
            <Text variant="bodySm" tone="subdued">
              © 2026 AI Instafeed by{" "}
              <a
                href="https://apps.shopify.com/partners/boost-star"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "inherit", textDecoration: "underline" }}
              >
                BOOST STAR Experts
              </a>
            </Text>
            <InlineStack gap="200" align="center">
              <Text variant="bodySm" tone="subdued">
                Terms of Service
              </Text>
              <Text variant="bodySm" tone="subdued">
                •
              </Text>
              <Text variant="bodySm" tone="subdued">
                Privacy Policy
              </Text>
            </InlineStack>
          </BlockStack>
        </Box>

        {/* Native Save Bar */}
        <ui-save-bar id="app-config-save-bar">
          <button variant="primary" onClick={applyChanges}>
            Save
          </button>
          <button onClick={discardChanges}>Discard</button>
        </ui-save-bar>
      </BlockStack>
    </Page>
  );
}
