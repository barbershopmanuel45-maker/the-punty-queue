import { useEffect } from "react";

export default function HideLovableBadge() {
  useEffect(() => {
    const exactText = "Edit with Lovable";

    const hideBadge = () => {
      document.querySelectorAll("a, button, div, span").forEach((el) => {
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();

        if (!text.includes(exactText)) return;

        const rect = el.getBoundingClientRect();

        const isLikelyFloatingBadge =
          rect.width > 60 &&
          rect.width < 260 &&
          rect.height > 20 &&
          rect.height < 100 &&
          rect.bottom > window.innerHeight - 180 &&
          rect.right > window.innerWidth - 320;

        if (!isLikelyFloatingBadge) return;

        const container =
          el.closest("a") ||
          el.closest("button") ||
          el.closest("div") ||
          el;

        if (container instanceof HTMLElement) {
          container.style.setProperty("display", "none", "important");
          container.style.setProperty("visibility", "hidden", "important");
          container.style.setProperty("pointer-events", "none", "important");
          container.style.setProperty("opacity", "0", "important");
        }
      });
    };

    hideBadge();

    const observer = new MutationObserver(() => {
      hideBadge();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener("load", hideBadge);
    window.addEventListener("resize", hideBadge);

    return () => {
      observer.disconnect();
      window.removeEventListener("load", hideBadge);
      window.removeEventListener("resize", hideBadge);
    };
  }, []);

  return null;
}
