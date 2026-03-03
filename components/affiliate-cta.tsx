"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

type AffiliateData = {
  slug: string;
  name: string;
  ctaText: string;
  ctaDescription: string | null;
  disclaimer: string | null;
  logoUrl: string | null;
};

type Props = {
  source: "blog" | "news" | "chat" | "newsletter";
  referrer?: string;
  variant?: "inline" | "banner" | "sidebar";
  className?: string;
};

export function AffiliateCTA({ source, referrer, variant = "inline", className = "" }: Props) {
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);

  useEffect(() => {
    fetch(`/api/affiliates/active?source=${source}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setAffiliate(data);
      })
      .catch(() => {});
  }, [source]);

  if (!affiliate) return null;

  const href = `/go/${affiliate.slug}?src=${source}${referrer ? `&ref=${encodeURIComponent(referrer)}` : ""}`;

  if (variant === "banner") {
    return (
      <div className={`rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-yellow-500/5 p-5 ${className}`}>
        <div className="flex items-center gap-4">
          {affiliate.logoUrl && (
            <img src={affiliate.logoUrl} alt={affiliate.name} className="h-10 w-10 rounded-lg object-contain" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{affiliate.name}</p>
            {affiliate.ctaDescription && (
              <p className="text-xs text-gray-400 mt-0.5">{affiliate.ctaDescription}</p>
            )}
          </div>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0"
          >
            {affiliate.ctaText}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        {affiliate.disclaimer && (
          <p className="text-[10px] text-gray-600 mt-2">{affiliate.disclaimer}</p>
        )}
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center ${className}`}>
        {affiliate.logoUrl && (
          <img src={affiliate.logoUrl} alt={affiliate.name} className="h-8 mx-auto mb-2 object-contain" />
        )}
        <p className="text-xs text-gray-400 mb-2">{affiliate.ctaDescription || affiliate.name}</p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {affiliate.ctaText}
          <ExternalLink className="w-3 h-3" />
        </a>
        {affiliate.disclaimer && (
          <p className="text-[10px] text-gray-600 mt-2">{affiliate.disclaimer}</p>
        )}
      </div>
    );
  }

  // Inline (default)
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-orange-500/15 bg-orange-500/5 px-4 py-3 ${className}`}>
      {affiliate.logoUrl && (
        <img src={affiliate.logoUrl} alt={affiliate.name} className="h-6 w-6 rounded object-contain flex-shrink-0" />
      )}
      <p className="text-xs text-gray-400 flex-1">
        {affiliate.ctaDescription || affiliate.name}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-md transition-colors flex-shrink-0"
      >
        {affiliate.ctaText}
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
