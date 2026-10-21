import React, { useEffect, useState } from "react";
import { Prompt, PromptAttachment, PromptType } from "../types";
import { Edit, Trash2, Heart, Copy, Star, Check, Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { loadDriveImage } from "../services/googleDriveService";
import { getAiModels } from "../constants/models";

interface PromptCardProps {
  prompt: Prompt;
  onEdit: (prompt: Prompt) => void;
  onDelete: (promptId: string) => void;
  onToggleFavorite: (promptId: string) => void;
  onCopy: (prompt: Prompt) => void;
  onOpen: (prompt: Prompt) => void;
}

export const formatPromptType = (type?: PromptType): string => {
  switch (type) {
    case "IMG_TO_IMG":
      return "Image-to-Image";
    case "TXT_TO_IMG":
      return "Text-to-Image";
    case "TXT_TO_TXT":
    default:
      return "Text Prompt";
  }
};

const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopy,
  onOpen,
}) => {
  const { driveAccessToken } = useAuth();
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const createdUrls: string[] = [];
    const attachments = prompt.attachments || [];
    if (!driveAccessToken || attachments.length === 0) {
      setThumbnailUrls({});
      return () => undefined;
    }
    Promise.all(
      attachments.map(async (attachment: PromptAttachment) => {
        try {
          const url = await loadDriveImage(attachment.driveFileId, driveAccessToken);
          createdUrls.push(url);
          return [attachment.id, url] as const;
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (!active) return;
      setThumbnailUrls(
        Object.fromEntries(
          results.filter((result): result is readonly [string, string] => Boolean(result))
        )
      );
    });
    return () => {
      active = false;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [prompt.attachments, driveAccessToken]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const attachments = prompt.attachments || [];
  const isImagePrompt = prompt.promptType === "IMG_TO_IMG" || prompt.promptType === "TXT_TO_IMG";
  const testedModels = getAiModels(prompt.testedModels?.length ? prompt.testedModels : prompt.testedModel ? [prompt.testedModel] : []);
  const hasImages = attachments.length > 0;
  const primaryAttachment = hasImages ? attachments[0] : null;
  const primaryImageUrl = primaryAttachment ? (thumbnailUrls[primaryAttachment.id] || primaryAttachment.webViewLink) : null;

  // Rating approximation from usage
  const rating = Math.min(5, 4.5 + ((prompt.usageCount % 5) * 0.1)).toFixed(1);

  return (
    <div
      onClick={() => onOpen(prompt)}
      className="card-enter group relative flex flex-col justify-between h-[360px] w-full cursor-pointer overflow-hidden rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-navy-800 p-4 shadow-sm hover:border-slate-300 dark:hover:border-navy-700 hover:shadow-md transition-all duration-200"
    >
      {/* Top Header Row: Category Badge + Actions (Like, Edit, Delete) */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        {/* Category / Type Chip */}
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-[#0057D6] dark:bg-blue-950/60 dark:text-blue-300">
          <Sparkles className="w-3 h-3" />
          <span>{prompt.category || formatPromptType(prompt.promptType)}</span>
        </span>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {/* Quick Edit/Delete on Hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(prompt);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-navy-800 dark:hover:bg-navy-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Edit prompt"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(prompt.id);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-50 dark:bg-navy-800 dark:hover:bg-red-950/40 text-slate-600 hover:text-red-500 transition-colors"
              title="Delete prompt"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          {/* Favorite Heart Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(prompt.id);
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              prompt.isFavorite
                ? "bg-red-50 dark:bg-red-950/40 text-red-500 shadow-none"
                : "text-slate-400 hover:text-red-500"
            }`}
            title={prompt.isFavorite ? "Remove favorite" : "Add to favorites"}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-transform active:scale-125 ${
                prompt.isFavorite ? "fill-red-500 text-red-500" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Middle Content Section */}
      <div className="flex-1 flex flex-col justify-start overflow-hidden">
        {/* Title */}
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug mb-1.5 group-hover:text-[#0057D6] dark:group-hover:text-blue-400 transition-colors">
          {prompt.title}
        </h4>

        {/* Thumbnail Preview for Images, or Text Snippet */}
        {isImagePrompt && primaryImageUrl ? (
          <div className="relative w-full h-28 rounded-lg overflow-hidden mb-2 bg-slate-100 dark:bg-navy-950">
            <img
              src={primaryImageUrl}
              alt={prompt.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-4 leading-relaxed mb-2.5">
            {prompt.content}
          </p>
        )}

        {/* Tested Models row */}
        {testedModels.length > 0 && (
          <div className="flex items-center gap-1.5 mt-auto mb-1.5 overflow-hidden">
            {testedModels.slice(0, 3).map((model) => (
              <span
                key={model.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-navy-800 text-[10px] font-medium text-slate-600 dark:text-slate-300"
                title={model.name}
              >
                <img src={model.icon} alt="" className="w-3 h-3 object-contain" />
                <span>{model.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Footer Section: Stats & Primary Copy Button */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-navy-800 flex items-center justify-between gap-2">
        {/* Rating and Usage Stats */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">{rating}</span>
          <span>•</span>
          <span>{prompt.usageCount} uses</span>
        </div>

        {/* Solid Blue Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
            copied
              ? "bg-emerald-600 text-white"
              : "bg-[#0057D6] hover:bg-[#0047B0] text-white"
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PromptCard;
