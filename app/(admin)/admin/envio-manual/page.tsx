"use client";

import { FormEvent, useEffect, useState } from "react";
import { FileUp, Image as ImageIcon, RefreshCw, Send, Volume2 } from "lucide-react";
import Image from "next/image";

type ManualItem = {
  id: string;
  createdAt: string;
};

type ManualPodcast = ManualItem & {
  title: string;
  script: string;
  ttsVoice: string | null;
};

type ManualImage = ManualItem & {
  caption: string;
  imageUrl: string;
};

type ManualContentList = {
  podcasts: ManualPodcast[];
  images: ManualImage[];
};

export default function ManualContentPage() {
  const [title, setTitle] = useState("Panorama Alvinegro");
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [sendToGroup, setSendToGroup] = useState(false);
  const [sendToPremium, setSendToPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [items, setItems] = useState<ManualContentList>({ podcasts: [], images: [] });

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/manual-content");
      if (res.ok) {
        setItems(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const data = new FormData();
      data.set("title", title);
      data.set("caption", caption);
      data.set("sendToGroup", String(sendToGroup));
      data.set("sendToPremium", String(sendToPremium));
      if (image) data.set("image", image);
      if (audio) data.set("audio", audio);

      const res = await fetch("/api/admin/manual-content", {
        method: "POST",
        body: data,
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Erro ao salvar conteudo");
      }

      const failed = Array.isArray(payload.sent)
        ? payload.sent.filter((item: { ok: boolean }) => !item.ok).length
        : 0;
      const sent = Array.isArray(payload.sent)
        ? payload.sent.filter((item: { ok: boolean }) => item.ok).length
        : 0;
      setResult(
        failed
          ? `Conteudo salvo. Envios OK: ${sent}. Falhas: ${failed}.`
          : `Conteudo salvo${sent ? ` e enviado (${sent} midias/mensagens).` : "."}`
      );
      setImage(null);
      setAudio(null);
      setCaption("");
      await loadItems();
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Erro ao salvar conteudo");
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white md:text-3xl">
            <FileUp className="h-7 w-7 text-orange-500" />
            Envio Manual
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Suba imagem, audio e legenda para publicar no grupo ou preparar envio premium.
          </p>
        </div>
        <button
          onClick={loadItems}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {result && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
          {result}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-gray-400">Titulo</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60"
              placeholder="Panorama Alvinegro"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={sendToGroup}
                onChange={(event) => setSendToGroup(event.target.checked)}
                className="h-4 w-4 accent-orange-500"
              />
              Enviar no grupo
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={sendToPremium}
                onChange={(event) => setSendToPremium(event.target.checked)}
                className="h-4 w-4 accent-orange-500"
              />
              Enviar para premium
            </label>
          </div>
        </div>

        <label className="space-y-1 block">
          <span className="text-xs text-gray-400">Legenda / chamada</span>
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={6}
            className="w-full resize-y rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60"
            placeholder="Resumo da semana, chamada para a Fiel e contexto do audio."
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 rounded-lg border border-dashed border-white/15 bg-black/25 p-4">
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <ImageIcon className="h-4 w-4 text-orange-500" />
              Imagem
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setImage(event.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            {image && <p className="text-xs text-gray-500">{image.name}</p>}
          </label>

          <label className="space-y-2 rounded-lg border border-dashed border-white/15 bg-black/25 p-4">
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <Volume2 className="h-4 w-4 text-orange-500" />
              Audio
            </span>
            <input
              type="file"
              accept="audio/*"
              onChange={(event) => setAudio(event.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            {audio && <p className="text-xs text-gray-500">{audio.name}</p>}
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting || !title.trim() || !caption.trim() || (!image && !audio)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? "Processando..." : "Salvar conteudo"}
        </button>
      </form>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <ImageIcon className="h-5 w-5 text-orange-500" />
            Imagens recentes
          </h2>
          <div className="space-y-3">
            {items.images.length ? (
              items.images.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-lg border border-white/10 bg-black/25 p-3">
                  <Image
                    src={item.imageUrl}
                    alt=""
                    width={48}
                    height={64}
                    className="h-16 w-12 rounded object-cover"
                  />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm text-white">{item.caption}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatDate(item.createdAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhuma imagem manual ainda.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <Volume2 className="h-5 w-5 text-orange-500" />
            Audios recentes
          </h2>
          <div className="space-y-3">
            {items.podcasts.length ? (
              items.podcasts.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                  <p className="font-medium text-white">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-400">{item.script}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">{formatDate(item.createdAt)}</p>
                    <audio controls src={`/api/podcast/${item.id}/audio`} className="h-8 max-w-56" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhum audio manual ainda.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
