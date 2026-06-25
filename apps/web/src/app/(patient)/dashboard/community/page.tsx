"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Heart, MessageCircle, Repeat2,
  Image as ImageIcon, X, Plus, Users,
  ChevronLeft, ChevronRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type AuthorProfile = {
  id: string;
  name: string;
  role: string;
  patientProfile: { country: string } | null;
  practitionerProfile: { specialty: string } | null;
};

type RepostAuthor = { id: string; name: string; role: string };

type MediaType = "IMAGE" | "VIDEO" | null;

type RepostRef = {
  id: string;
  content: string;
  mediaUrl: string | null;
  mediaType: MediaType;
  author: RepostAuthor;
};

type Post = {
  id: string;
  content: string;
  mediaUrl: string | null;
  mediaType: MediaType;
  authorId: string;
  author: AuthorProfile;
  repostOf: RepostRef | null;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  isLikedByMe: boolean;
  createdAt: string;
};

type Comment = {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; role: string };
};

type StoryItem = {
  id: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  expiresAt: string;
};

type StoryGroup = {
  author: { id: string; name: string; role: string };
  storyCount: number;
  stories: StoryItem[];
};

// ─── Palette helpers ──────────────────────────────────────────────────────────

const PALETTE = [
  "bg-teal-500",    "bg-violet-500", "bg-rose-500",
  "bg-amber-500",   "bg-sky-500",    "bg-pink-500",
  "bg-emerald-500", "bg-indigo-500",
];

function avatarColor(name: string) {
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sz = { xs: "w-6 h-6 text-[9px]", sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-base", xl: "w-16 h-16 text-lg" }[size];
  return (
    <div className={`${sz} ${avatarColor(name)} rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}>
      {initials(name)}
    </div>
  );
}

// ─── Role tag ─────────────────────────────────────────────────────────────────

function RoleTag({ role }: { role: string }) {
  if (role !== "PROVIDER") return null;
  return (
    <span className="inline-flex items-center text-[10px] font-extrabold tracking-wide px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
      Specialist
    </span>
  );
}

// ─── Story Ring ───────────────────────────────────────────────────────────────

function StoryRingItem({
  group,
  onClick,
}: {
  group: StoryGroup;
  onClick: () => void;
}) {
  const multiStory = group.storyCount > 1;

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 shrink-0 group">
      <div className="relative">
        {/* Gradient ring — conic for multi-story segmentation visual */}
        <div
          style={{ background: "linear-gradient(135deg, #0d9488, #0891b2, #7c3aed)" }}
          className="p-[2.5px] rounded-full"
        >
          <div className="bg-white p-[2px] rounded-full">
            <Avatar name={group.author.name} size="lg" />
          </div>
        </div>

        {/* Story count badge */}
        {multiStory && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white shadow">
            {group.storyCount > 9 ? "9+" : group.storyCount}
          </span>
        )}
      </div>
      <span className="text-[11px] text-gray-600 font-semibold max-w-[56px] truncate leading-tight">
        {group.author.name.split(" ")[0]}
      </span>
    </button>
  );
}

// ─── Story Viewer Modal ───────────────────────────────────────────────────────

function StoryViewer({
  group,
  onClose,
}: {
  group: StoryGroup;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const story = group.stories[idx];

  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => (idx < group.stories.length - 1 ? setIdx(idx + 1) : onClose()),
    [idx, group.stories.length, onClose]
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-gray-900 rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress segments */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden bg-white/30">
              <div
                className={`h-full bg-white rounded-full ${i < idx ? "w-full" : i === idx ? "w-full" : "w-0"}`}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-7 left-3 right-10 flex items-center gap-2 z-20">
          <Avatar name={group.author.name} size="xs" />
          <div>
            <p className="text-white text-xs font-bold leading-none">{group.author.name}</p>
            <p className="text-white/60 text-[10px]">{relativeTime(story.createdAt)}</p>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-7 right-3 z-20 w-7 h-7 bg-black/30 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Media */}
        {story.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.imageUrl}
            alt=""
            className="w-full aspect-[9/16] object-cover max-h-[500px]"
          />
        ) : (
          <div
            className="w-full aspect-[9/16] max-h-[500px] flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${avatarGradient(group.author.name)})` }}
          >
            <p className="text-white text-xl font-bold px-6 text-center leading-relaxed">
              {story.content}
            </p>
          </div>
        )}

        {/* Caption overlay when has image */}
        {story.imageUrl && story.content && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-10">
            <p className="text-white text-sm leading-relaxed">{story.content}</p>
          </div>
        )}

        {/* Tap zones for navigation */}
        <div className="absolute inset-0 flex">
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="flex-1 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity"
            disabled={idx === 0}
          >
            {idx > 0 && <ChevronLeft className="w-6 h-6 text-white drop-shadow" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="flex-1 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-6 h-6 text-white drop-shadow" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Map a name to a two-stop gradient for story cards without images
function avatarGradient(name: string): string {
  const gradients = [
    "#0d9488, #0891b2", "#7c3aed, #db2777", "#0891b2, #0ea5e9",
    "#d97706, #dc2626", "#059669, #0d9488", "#9333ea, #6366f1",
  ];
  return gradients[name.charCodeAt(0) % gradients.length];
}

// ─── Comments thread ──────────────────────────────────────────────────────────

function CommentsThread({
  postId,
  onCommentAdded,
  onCommentFailed,
}: {
  postId: string;
  onCommentAdded: () => void;
  onCommentFailed: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guards against the initial GET resolving *after* an optimistic comment
  // was already added — without this, a slow first fetch can silently wipe
  // out a comment the user just submitted.
  const hasLocalMutation = useRef(false);

  useEffect(() => {
    fetch(`/api/community/comments?postId=${postId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Comment[]) => {
        if (!hasLocalMutation.current) setComments(data);
      })
      .finally(() => setIsLoading(false));
  }, [postId]);

  async function handleSubmit() {
    const content = draft.trim();
    if (!content || isSubmitting) return;

    setIsSubmitting(true);
    setDraft("");
    hasLocalMutation.current = true;

    // Optimistic insert with a temporary id, replaced once the server responds.
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
      id: tempId,
      postId,
      content,
      createdAt: new Date().toISOString(),
      author: { id: "me", name: "You", role: "PATIENT" },
    };
    setComments((prev) => [...prev, optimisticComment]);
    onCommentAdded();

    try {
      const res = await fetch("/api/community/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content }),
      });
      if (!res.ok) throw new Error("failed");
      const saved: Comment = await res.json();
      setComments((prev) => prev.map((c) => (c.id === tempId ? saved : c)));
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      onCommentFailed();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="border-t border-gray-50 px-4 py-3 space-y-3">
      {isLoading ? (
        <p className="text-xs text-gray-400">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400">No comments yet — be the first to reply.</p>
      ) : (
        <div className="space-y-2.5">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar name={c.author.name} size="xs" />
              <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-xs font-bold text-gray-800">{c.author.name}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="Write a comment…"
          className="flex-1 text-sm border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
        />
        <button
          onClick={handleSubmit}
          disabled={!draft.trim() || isSubmitting}
          className="text-sm font-bold text-teal-600 hover:text-teal-800 disabled:opacity-40 disabled:cursor-not-allowed px-2"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  onLike,
  onCommentCountChange,
}: {
  post: Post;
  onLike: (id: string) => void;
  onCommentCountChange: (postId: string, delta: number) => void;
}) {
  const [showComments, setShowComments] = useState(false);

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ① Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar name={post.author.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900 text-sm truncate">{post.author.name}</p>
            <RoleTag role={post.author.role} />
          </div>
          <p className="text-xs text-gray-400">
            {post.author.practitionerProfile?.specialty
              ? post.author.practitionerProfile.specialty + " · "
              : post.author.patientProfile?.country
              ? post.author.patientProfile.country + " · "
              : ""}
            {relativeTime(post.createdAt)} ago
          </p>
        </div>
      </div>

      {/* ② Repost reference card */}
      {post.repostOf && (
        <div className="mx-4 mb-3 border border-gray-100 rounded-xl p-3 bg-gray-50">
          <div className="flex items-center gap-2 mb-1">
            <Avatar name={post.repostOf.author.name} size="xs" />
            <span className="text-xs font-bold text-gray-600">{post.repostOf.author.name}</span>
            {post.repostOf.author.role === "PROVIDER" && (
              <span className="text-[9px] font-bold text-teal-600">Specialist</span>
            )}
          </div>
          <p className="text-xs text-gray-600 line-clamp-2">{post.repostOf.content}</p>
          {post.repostOf.mediaUrl && (
            post.repostOf.mediaType === "VIDEO" ? (
              <video src={post.repostOf.mediaUrl} className="mt-2 w-full h-28 object-cover rounded-lg" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.repostOf.mediaUrl}
                alt=""
                className="mt-2 w-full h-28 object-cover rounded-lg"
              />
            )
          )}
        </div>
      )}

      {/* ③ Media — full-bleed, no horizontal padding */}
      {post.mediaUrl && (
        post.mediaType === "VIDEO" ? (
          <video
            src={post.mediaUrl}
            controls
            className="w-full object-cover max-h-[480px] bg-black"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.mediaUrl}
            alt=""
            className="w-full object-cover max-h-[480px]"
            loading="lazy"
          />
        )
      )}

      {/* ④ Interaction bar */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-1">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
            post.isLikedByMe
              ? "text-rose-500 bg-rose-50"
              : "text-gray-400 hover:text-rose-400 hover:bg-rose-50"
          }`}
          aria-label={post.isLikedByMe ? "Unlike" : "Like"}
        >
          <Heart className={`w-5 h-5 transition-transform ${post.isLikedByMe ? "fill-current scale-110" : ""}`} />
          <span>{post.likeCount > 0 ? post.likeCount : ""}</span>
        </button>

        <button
          onClick={() => setShowComments((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all ${
            showComments ? "text-teal-600 bg-teal-50" : "text-gray-400 hover:text-teal-500 hover:bg-teal-50"
          }`}
          aria-label="Comment"
        >
          <MessageCircle className="w-5 h-5" />
          <span>{post.commentCount > 0 ? post.commentCount : ""}</span>
        </button>

        <button
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
          aria-label="Repost"
        >
          <Repeat2 className="w-5 h-5" />
          <span>{post.repostCount > 0 ? post.repostCount : ""}</span>
        </button>
      </div>

      {/* ⑤ Caption — below interactions, Instagram-style */}
      {post.content && (
        <div className="px-4 pb-4 pt-1">
          <p className="text-sm text-gray-800 leading-relaxed">
            <span className="font-bold text-gray-900 mr-1.5">{post.author.name.split(" ")[0]}</span>
            {post.content}
          </p>
        </div>
      )}

      {/* ⑥ Comments thread — lazy-mounted only once expanded */}
      {showComments && (
        <CommentsThread
          postId={post.id}
          onCommentAdded={() => onCommentCountChange(post.id, 1)}
          onCommentFailed={() => onCommentCountChange(post.id, -1)}
        />
      )}
    </article>
  );
}

// ─── Feed skeleton ────────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-gray-100" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-32 bg-gray-200 rounded-full" />
              <div className="h-2 w-20 bg-gray-100 rounded-full" />
            </div>
          </div>
          <div className={`w-full bg-gray-100 ${i % 2 === 0 ? "h-56" : "h-36"}`} />
          <div className="px-4 py-3 space-y-2">
            <div className="h-3 w-full bg-gray-100 rounded" />
            <div className="h-3 w-3/4 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const { data: session } = useSession();

  const [posts, setPosts]             = useState<Post[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Story viewer
  const [activeGroup, setActiveGroup]   = useState<StoryGroup | null>(null);

  // Compose post
  const [draft, setDraft]               = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]     = useState<string | null>(null);
  const [isPosting, setIsPosting]       = useState(false);
  const [uploadStage, setUploadStage]   = useState<"idle" | "uploading" | "posting">("idle");
  const [postError, setPostError]       = useState("");

  // Story creation
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [storyText, setStoryText]       = useState("");
  const [storyImage, setStoryImage]     = useState("");
  const [isPostingStory, setIsPostingStory] = useState(false);

  // Initial load: fetch feed + stories in parallel
  useEffect(() => {
    Promise.all([
      fetch("/api/community/feed?page=1").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/community/stories").then((r) => (r.ok ? r.json() : [])),
    ]).then(([feedData, storiesData]: [Post[], StoryGroup[]]) => {
      setPosts(feedData);
      setHasMore(feedData.length === 10);
      setStoryGroups(storiesData);
      setIsLoadingFeed(false);
    });
  }, []);

  async function loadMorePosts() {
    const nextPage = page + 1;
    setIsLoadingMore(true);
    const data: Post[] = await fetch(`/api/community/feed?page=${nextPage}`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
    setPosts((prev) => [...prev, ...data]);
    setPage(nextPage);
    setHasMore(data.length === 10);
    setIsLoadingMore(false);
  }

  function handleFileSelect(file: File | null) {
    setPostError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const cap = isImage ? 5 * 1024 * 1024 : 50 * 1024 * 1024;

    if (!isImage && !isVideo) {
      setPostError("Only image and video files are supported.");
      return;
    }
    if (file.size > cap) {
      setPostError(`File exceeds the ${cap / (1024 * 1024)}MB limit for ${isImage ? "images" : "videos"}.`);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  // Direct-to-S3 upload: request a pre-signed PUT URL, upload the raw file
  // straight to S3 (never through our own server), then hand the resulting
  // public URL to createPost. Keeps large media off our compute entirely.
  async function uploadSelectedFile(): Promise<{ mediaUrl: string; mediaType: "IMAGE" | "VIDEO" } | null> {
    if (!selectedFile) return null;

    const presignRes = await fetch("/api/upload/presigned-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
      }),
    });
    if (!presignRes.ok) {
      const err = await presignRes.json().catch(() => ({}));
      throw new Error(err.error || "Failed to prepare upload.");
    }
    const { uploadUrl, publicUrl, mediaType } = await presignRes.json();

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": selectedFile.type },
      body: selectedFile,
    });
    if (!putRes.ok) throw new Error("Upload to storage failed.");

    return { mediaUrl: publicUrl, mediaType };
  }

  async function handlePost() {
    if (!draft.trim() && !selectedFile) return;
    setIsPosting(true);
    setPostError("");

    try {
      let media: { mediaUrl: string; mediaType: "IMAGE" | "VIDEO" } | null = null;
      if (selectedFile) {
        setUploadStage("uploading");
        media = await uploadSelectedFile();
      }

      setUploadStage("posting");
      const res = await fetch("/api/community/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draft.trim(),
          mediaUrl: media?.mediaUrl,
          mediaType: media?.mediaType,
        }),
      });
      if (!res.ok) throw new Error("Failed to publish post.");

      const newPost: Post = await res.json();
      setPosts((prev) => [newPost, ...prev]);
      setDraft("");
      handleFileSelect(null);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsPosting(false);
      setUploadStage("idle");
    }
  }

  async function handleLike(postId: string) {
    // Optimistic update before the round-trip
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLikedByMe: !p.isLikedByMe, likeCount: p.isLikedByMe ? p.likeCount - 1 : p.likeCount + 1 }
          : p
      )
    );
    const res = await fetch("/api/community/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    // Revert on API failure
    if (!res.ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLikedByMe: !p.isLikedByMe, likeCount: p.isLikedByMe ? p.likeCount - 1 : p.likeCount + 1 }
            : p
        )
      );
    }
  }

  function handleCommentCountChange(postId: string, delta: number) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + delta } : p))
    );
  }

  async function handleAddStory() {
    if (!storyText.trim() && !storyImage) return;
    setIsPostingStory(true);
    const res = await fetch("/api/community/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: storyText.trim(), imageUrl: storyImage || undefined }),
    });
    if (res.ok) {
      const newStory: StoryItem & { author: { id: string; name: string; role: string } } = await res.json();
      setStoryGroups((prev) => {
        const existing = prev.find((g) => g.author.id === newStory.author.id);
        if (existing) {
          return prev.map((g) =>
            g.author.id === newStory.author.id
              ? { ...g, storyCount: g.storyCount + 1, stories: [newStory, ...g.stories] }
              : g
          );
        }
        return [
          { author: newStory.author, storyCount: 1, stories: [newStory] },
          ...prev,
        ];
      });
      setStoryText("");
      setStoryImage("");
      setShowStoryForm(false);
    }
    setIsPostingStory(false);
  }

  const userName = (session?.user as { name?: string })?.name ?? "You";

  return (
    <div className="max-w-[600px] mx-auto space-y-5 animate-in fade-in duration-500 pb-20">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-teal-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-teal-600" />
            Community
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Share your journey with women on similar paths.</p>
        </div>
      </div>

      {/* ── Story strip ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 space-y-3">
        <div className="flex items-start gap-4 overflow-x-auto pb-1 scrollbar-hide">

          {/* Add Story button */}
          <button
            onClick={() => setShowStoryForm((v) => !v)}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div className={`w-[60px] h-[60px] rounded-full border-2 border-dashed flex items-center justify-center transition-colors ${showStoryForm ? "border-teal-500 bg-teal-50 text-teal-600" : "border-teal-300 bg-gray-50 text-teal-400 hover:bg-teal-50"}`}>
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[11px] text-gray-500 font-semibold">Your Story</span>
          </button>

          {/* Story rings */}
          {storyGroups.length > 0 ? (
            storyGroups.map((group) => (
              <StoryRingItem
                key={group.author.id}
                group={group}
                onClick={() => setActiveGroup(group)}
              />
            ))
          ) : (
            <p className="text-sm text-gray-400 italic self-center py-2">
              No active stories — be the first!
            </p>
          )}
        </div>

        {/* Inline story compose form */}
        {showStoryForm && (
          <div className="border-t border-gray-50 pt-3 space-y-2">
            <textarea
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder="Share something… disappears in 24h."
              rows={2}
              className="w-full resize-none text-sm text-gray-800 placeholder-gray-400 border border-gray-100 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-300 transition-all"
            />
            <input
              type="url"
              value={storyImage}
              onChange={(e) => setStoryImage(e.target.value)}
              placeholder="Image URL (optional)"
              className="w-full text-sm border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowStoryForm(false)}
                className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStory}
                disabled={isPostingStory || (!storyText.trim() && !storyImage)}
                className="bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-1.5 rounded-xl transition-colors"
              >
                {isPostingStory ? "Sharing…" : "Share Story"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Compose post ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-3 items-start">
          <Avatar name={userName} />
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share something with the NauriCare community…"
            rows={3}
            className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 border border-gray-100 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-300 transition-all"
          />
        </div>

        {postError && (
          <p className="text-xs text-rose-500 font-medium px-1">{postError}</p>
        )}

        {previewUrl && selectedFile && (
          <div className="relative rounded-xl overflow-hidden border border-gray-100">
            {selectedFile.type.startsWith("video/") ? (
              <video src={previewUrl} className="w-full max-h-64 object-cover" controls />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="w-full max-h-64 object-cover" />
            )}
            <button
              onClick={() => handleFileSelect(null)}
              className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <input
          id="community-media-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          className="hidden"
        />

        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <label
            htmlFor="community-media-input"
            className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${selectedFile ? "text-teal-600 bg-teal-50" : "text-gray-400 hover:text-teal-600 hover:bg-teal-50"}`}
          >
            <ImageIcon className="w-4 h-4" />
            Photo / Video
          </label>
          <button
            onClick={handlePost}
            disabled={isPosting || (!draft.trim() && !selectedFile)}
            className="bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-2 rounded-xl transition-all"
          >
            {uploadStage === "uploading" ? "Uploading…" : uploadStage === "posting" ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      {/* ── Feed ── */}
      {isLoadingFeed ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-teal-200" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Be the first to post</h3>
          <p className="text-gray-400 mt-1.5 text-sm max-w-[240px] mx-auto">
            Start the conversation and connect with others on their wellness journey.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onLike={handleLike} onCommentCountChange={handleCommentCountChange} />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMorePosts}
                disabled={isLoadingMore}
                className="text-sm font-bold text-teal-600 hover:text-teal-800 px-6 py-2.5 rounded-xl border border-teal-100 hover:border-teal-300 hover:bg-teal-50 transition-all disabled:opacity-50"
              >
                {isLoadingMore ? "Loading…" : "Load more posts"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Story viewer modal */}
      {activeGroup && (
        <StoryViewer group={activeGroup} onClose={() => setActiveGroup(null)} />
      )}
    </div>
  );
}
