import { useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const shopify = useAppBridge();
  const [activeTab, setActiveTab] = useState("post");
  const [previewDevice, setPreviewDevice] = useState("mobile");

  // Central Dynamic State
  const [config, setConfig] = useState({
    instagramHandle: "floorlanduk",
    postFeed: {
      header: true,
      metrics: true,
      load: true,
      carousel: true,
      autoplay: true,
      desktopColumns: 4,
      mobileColumns: 2,
      aspectRatio: "4:5",
      gap: 12,
      theming: {
        text: "#000000",
        brand: "#6366f1",
        canvas: "#ffffff"
      }
    },
    stories: {
      heading: "Instagram Highlights",
      subheading: "Check out our latest stories and featured moments.",
      enable: true,
      carousel: true,
      visibility: true,
      typography: {
        heading: { color: "#000000", size: 18, weight: "Bold" },
        subheading: { color: "#64748b" }
      }
    }
  });

  const updateConfig = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const updateNestedConfig = (section, nested, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [nested]: {
          ...prev[section][nested],
          [key]: value
        }
      }
    }));
  };

  return (
    <div className="premium-dashboard">
      {/* Header Bar */}
      <div className="premium-header">
        <div className="brand-section">
          <div className="brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Ai Highlight Center</h1>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>V2.0 PRO</span>
          </div>
          <div className="status-badge" style={{ marginLeft: "20px" }}>
            <div className="status-dot"></div>
            System Online <span style={{ opacity: 0.6, marginLeft: "4px" }}>Active</span>
          </div>
        </div>
        <button className="premium-button button-primary">
          <span>+</span> New Feed
        </button>
      </div>

      <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
        {/* Connect Account Card */}
        <div className="premium-card" style={{ padding: "24px" }}>
          <div>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600" }}>1 Connect Your Account</h2>
            <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#6b7280" }}>Sync your Instagram feed to your Shopify storefront instantly.</p>
          </div>
          
          <div className="input-group-nested">
            <div style={{ position: "relative", flex: 1 }}>
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", zIndex: 1 }}>@</span>
              <input 
                type="text" 
                className="premium-input" 
                style={{ paddingLeft: "36px" }}
                value={config.instagramHandle}
                onChange={(e) => setConfig({ ...config, instagramHandle: e.target.value })}
                placeholder="instagram_handle"
              />
            </div>
            <button className="premium-button button-primary">Update Feed</button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="main-content-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
          
          {/* Left Column: Settings */}
          <div className="premium-card" style={{ padding: "24px", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "8px", height: "8px", background: "var(--premium-accent)", borderRadius: "50%" }}></div>
                <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>DASHBOARD CONFIGURATOR</h2>
              </div>
              <button className="premium-button button-primary" style={{ padding: "8px 20px" }} onClick={() => shopify.toast.show("Configuration Saved!")}>Save Changes</button>
            </div>

            <div className="tab-container">
              <div className={`tab-item ${activeTab === "post" ? "active" : ""}`} onClick={() => setActiveTab("post")}>Feed Grid Settings</div>
              <div className={`tab-item ${activeTab === "story" ? "active" : ""}`} onClick={() => setActiveTab("story")}>Story & Layouts</div>
            </div>

            <div className="tab-content-container" key={activeTab} style={{ animation: "fadeInBlur 0.4s ease-out" }}>
              {activeTab === "post" ? (
                <>
                  <h3 className="input-label" style={{ marginBottom: "12px" }}>Dynamic Modules</h3>
                  {[
                    { id: "header", label: "Profile Header", sub: "Show store bio & icon", icon: "👤" },
                    { id: "metrics", label: "Engagement Hub", sub: "Visualize social proof", icon: "📊" },
                    { id: "load", label: "Infinite Paging", sub: "Zero-latency scrolling", icon: "🔄" },
                    { id: "carousel", label: "Smart Carousel", sub: "Auto-swipe logic", icon: "📱" },
                  ].map((item, idx) => (
                    <div key={item.id} className="setting-row" style={{ animation: `slideInUp 0.3s ease-out ${idx * 0.05}s both` }}>
                      <div className="setting-info">
                        <div className="setting-icon">{item.icon}</div>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "600" }}>{item.label}</div>
                          <div style={{ fontSize: "12px", color: "#9ca3af" }}>{item.sub}</div>
                        </div>
                      </div>
                      <label className="premium-switch">
                        <input 
                          type="checkbox" 
                          checked={config.postFeed[item.id]} 
                          onChange={(e) => updateConfig("postFeed", item.id, e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  ))}

                  <div className="visual-architecture">
                    <h3 className="input-label">Grid Architecture</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                      <div className="input-group">
                        <label className="input-label" style={{ fontSize: "10px" }}>Desktop Columns</label>
                        <select 
                          className="premium-input" 
                          value={config.postFeed.desktopColumns}
                          onChange={(e) => updateConfig("postFeed", "desktopColumns", parseInt(e.target.value))}
                        >
                          {[3,4,5,6].map(n => <option key={n} value={n}>{n} Columns</option>)}
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="input-label" style={{ fontSize: "10px" }}>Mobile Columns</label>
                        <select 
                          className="premium-input" 
                          value={config.postFeed.mobileColumns}
                          onChange={(e) => updateConfig("postFeed", "mobileColumns", parseInt(e.target.value))}
                        >
                          {[1,2,3].map(n => <option key={n} value={n}>{n} Columns</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: "10px" }}>Visual Gap ({config.postFeed.gap}px)</label>
                      <input 
                        type="range" 
                        min="0" max="40" 
                        value={config.postFeed.gap}
                        onChange={(e) => updateConfig("postFeed", "gap", parseInt(e.target.value))}
                        className="premium-input" 
                        style={{ padding: 0 }} 
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="visual-architecture" style={{ marginTop: 0, marginBottom: "20px" }}>
                    <h3 className="input-label">Story Branding</h3>
                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: "10px" }}>Heading Text</label>
                      <input 
                        type="text" 
                        className="premium-input" 
                        value={config.stories.heading}
                        onChange={(e) => updateConfig("stories", "heading", e.target.value)}
                      />
                    </div>
                    <div className="input-group" style={{ marginTop: "12px" }}>
                      <label className="input-label" style={{ fontSize: "10px" }}>Sub-description</label>
                      <textarea 
                        className="premium-input" 
                        style={{ height: "60px", resize: "none" }}
                        value={config.stories.subheading}
                        onChange={(e) => updateConfig("stories", "subheading", e.target.value)}
                      />
                    </div>
                  </div>

                  <h3 className="input-label">Layout Modules</h3>
                  {[
                    { id: "enable", label: "Active Highlights", sub: "Render top-bar stories", icon: "🔥" },
                    { id: "carousel", label: "Snap Scrolling", sub: "Touch-optimized motion", icon: "✨" },
                  ].map((item, idx) => (
                    <div key={item.id} className="setting-row" style={{ animation: `slideInUp 0.3s ease-out ${idx * 0.05}s both` }}>
                      <div className="setting-info">
                        <div className="setting-icon">{item.icon}</div>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "600" }}>{item.label}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>{item.sub}</div>
                        </div>
                      </div>
                      <label className="premium-switch">
                        <input 
                          type="checkbox" 
                          checked={config.stories[item.id]} 
                          onChange={(e) => updateConfig("stories", item.id, e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  ))}
                  <div className="visual-architecture" style={{ marginTop: "24px" }}>
                     <h3 className="input-label">Heading Typography</h3>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <span style={{ fontSize: "13px" }}>Font Size ({config.stories.typography.heading.size}px)</span>
                        <input 
                           type="range" min="12" max="48"
                           value={config.stories.typography.heading.size}
                           onChange={(e) => updateNestedConfig("stories", "typography", "heading", { ...config.stories.typography.heading, size: parseInt(e.target.value) })}
                           style={{ width: "100px" }}
                        />
                     </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "32px", borderTop: "1px solid #f1f5f9", paddingTop: "24px" }}>
              <button className="premium-button" style={{ color: "#64748b", background: "transparent" }}>Discard</button>
              <button className="premium-button button-success">Apply Changes</button>
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="premium-card" style={{ padding: "24px", background: "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#64748b" }}>LIVE RENDERING</h2>
              <div style={{ display: "flex", gap: "6px", background: "white", padding: "4px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <button onClick={() => setPreviewDevice("mobile")} className={`premium-button ${previewDevice === "mobile" ? "button-primary" : ""}`} style={{ padding: "8px 12px", borderRadius: "8px", background: previewDevice === "mobile" ? "" : "transparent", color: previewDevice === "mobile" ? "" : "#64748b" }}>📱</button>
                <button onClick={() => setPreviewDevice("desktop")} className={`premium-button ${previewDevice === "desktop" ? "button-primary" : ""}`} style={{ padding: "8px 12px", borderRadius: "8px", background: previewDevice === "desktop" ? "" : "transparent", color: previewDevice === "desktop" ? "" : "#64748b" }}>💻</button>
              </div>
            </div>

            <div className="preview-container" style={{ background: "transparent", border: "none" }}>
                {previewDevice === "mobile" ? (
                   <div style={{ animation: "fadeInBlur 0.4s ease-out" }}>
                     <div style={{
                       width: "280px",
                       height: "560px",
                       background: "white",
                       borderRadius: "44px",
                       border: "12px solid #1e293b",
                       boxShadow: "0 35px 60px -15px rgba(0, 0, 0, 0.3)",
                       position: "relative",
                       overflow: "hidden"
                     }}>
                        {/* Status bar */}
                        <div style={{ height: "40px", padding: "14px 20px 0", display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: "700" }}>
                           <span>9:41</span>
                           <div style={{ display: "flex", gap: "4px" }}>📶 🔋</div>
                        </div>

                        {/* Store Header Mockup (Conditional) */}
                        {config.postFeed.header && (
                           <div style={{ padding: "20px 16px", background: "#fff", display: "flex", gap: "12px", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
                              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #e2e8f0" }}>📸</div>
                              <div>
                                 <div style={{ fontSize: "13px", fontWeight: "800" }}>@{config.instagramHandle}</div>
                                 <div style={{ fontSize: "10px", color: "#64748b" }}>Premium Collection 2024</div>
                              </div>
                           </div>
                        )}

                        <div style={{ padding: `${config.postFeed.gap}px`, display: "grid", gridTemplateColumns: `repeat(${config.postFeed.mobileColumns}, 1fr)`, gap: `${config.postFeed.gap}px` }}>
                           {[1,2,3,4,5,6].map(i => (
                              <div key={i} style={{ aspectRatio: "1/1", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                                 <div style={{ width: "100%", height: "100%", background: `linear-gradient(rgba(0,0,0,0.05), rgba(0,0,0,0.1))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {config.postFeed.metrics && <span style={{ fontSize: "8px", opacity: 0.5 }}>❤️ 1.2k</span>}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                   </div>
                ) : (
                  <div style={{ animation: "fadeInBlur 0.4s ease-out", width: "100%" }}>
                     <div style={{ width: "100%", maxWidth: "540px", margin: "0 auto" }}>
                        <div style={{ width: "100%", aspectRatio: "1.6/1", background: "#1e293b", borderRadius: "16px", padding: "10px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
                           <div style={{ width: "100%", height: "100%", background: "white", borderRadius: "8px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                              <div style={{ height: "30px", background: "#f1f5f9", display: "flex", alignItems: "center", px: "10px", gap: "6px", padding: "0 10px" }}>
                                 <div style={{ width: "6px", height: "6px", background: "#ff5f56", borderRadius: "50%" }}></div>
                                 <div style={{ width: "6px", height: "6px", background: "#ffbd2e", borderRadius: "50%" }}></div>
                                 <div style={{ width: "6px", height: "6px", background: "#27c93f", borderRadius: "50%" }}></div>
                              </div>
                              <div style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
                                 {activeTab === "story" ? (
                                    <div style={{ textAlign: "center", marginBottom: "30px" }}>
                                       <h4 style={{ fontSize: `${config.stories.typography.heading.size}px`, fontWeight: "800", margin: "0 0 8px 0" }}>{config.stories.heading}</h4>
                                       <p style={{ fontSize: "12px", color: config.stories.typography.subheading.color, margin: 0 }}>{config.stories.subheading}</p>
                                    </div>
                                 ) : (
                                    <>
                                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                             <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#6366f1" }}></div>
                                             <div style={{ height: "10px", width: "60px", background: "#e2e8f0", borderRadius: "5px" }}></div>
                                          </div>
                                          <div style={{ width: "80px", height: "24px", background: "#0f172a", borderRadius: "12px" }}></div>
                                       </div>
                                       <div style={{ display: "grid", gridTemplateColumns: `repeat(${config.postFeed.desktopColumns}, 1fr)`, gap: `${config.postFeed.gap}px` }}>
                                          {[1,2,3,4,5,6,7,8].map(i => <div key={i} style={{ aspectRatio: "1/1", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: "8px" }}></div>)}
                                       </div>
                                    </>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
