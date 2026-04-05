"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Pencil,
  Feather,
  RotateCcw,
  KeyRound,
  Orbit,
  Plus,
  Radar,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { addKey, deleteKey, resetKeyStatus, updateKey } from "../app/actions/keys";
import {
  platforms,
  resettableStatuses,
  type ActionResult,
  type KeyListItem,
  type KeyStatus,
  type Platform,
} from "../lib/key-management";

const addKeyInitialState: ActionResult = {
  success: false,
  message: "",
};

const statusStyles: Record<KeyStatus, string> = {
  active: "bg-emerald-100 text-emerald-800 ring-emerald-600/15",
  cooling: "bg-amber-100 text-amber-900 ring-amber-700/15",
  disabled: "bg-stone-200 text-stone-700 ring-stone-600/10",
  depleted: "bg-rose-100 text-rose-800 ring-rose-600/15",
};

const platformMeta: Record<Platform, { icon: typeof Orbit; tone: string }> = {
  OpenAI: { icon: Orbit, tone: "bg-teal-100 text-teal-800" },
  Claude: { icon: Feather, tone: "bg-orange-100 text-orange-800" },
  DeepSeek: { icon: Radar, tone: "bg-sky-100 text-sky-800" },
  Gemini: { icon: Sparkles, tone: "bg-fuchsia-100 text-fuchsia-800" },
};

function formatLastUsed(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function KeyDashboard({ initialKeys }: { initialKeys: KeyListItem[] }) {
  const keys = initialKeys;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<KeyListItem | null>(null);
  const [formState, formAction, isSubmitting] = useActionState(addKey, addKeyInitialState);
  const [editFormState, editFormAction, isEditSubmitting] = useActionState(updateKey, addKeyInitialState);
  const formRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  const stats = useMemo(() => {
    const activeCount = keys.filter((item) => item.status === "active").length;
    const coolingCount = keys.filter((item) => item.status === "cooling").length;

    return {
      total: keys.length,
      active: activeCount,
      cooling: coolingCount,
    };
  }, [keys]);

  function closeModal() {
    setIsModalOpen(false);
  }

  function openEditModal(key: KeyListItem) {
    setEditingKey(key);
    setIsEditModalOpen(true);
  }

  function closeEditModal() {
    setIsEditModalOpen(false);
    setEditingKey(null);
  }

  useEffect(() => {
    if (!formState.success) {
      return;
    }

    formRef.current?.reset();
    setIsModalOpen(false);
  }, [formState.success]);

  useEffect(() => {
    if (!editFormState.success) {
      return;
    }

    editFormRef.current?.reset();
    setIsEditModalOpen(false);
    setEditingKey(null);
  }, [editFormState.success]);

  return (
    <main className="min-h-screen px-4 py-10 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="fade-up grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="panel overflow-hidden rounded-[32px] p-8 sm:p-10">
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-stone-900/10 bg-white/60 px-3 py-1 text-sm text-stone-600">
                  <Activity className="h-4 w-4 text-teal-700" />
                  KeyRelay Console
                </span>
                <div className="space-y-3">
                  <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-stone-900 sm:text-5xl">
                    管理多平台 LLM Key 的状态、可用性与冷却窗口。
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
                    一个面向运维场景的简洁控制台，聚合 OpenAI、Claude、DeepSeek 与 Gemini 的 API Key 使用状态。
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/external-api-docs"
                  className="inline-flex items-center justify-center rounded-full border border-stone-900/10 bg-white/75 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-white"
                >
                  API 调用说明
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full border border-stone-900/10 bg-white/75 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-white"
                >
                  统计仪表盘
                </Link>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-teal-800"
                >
                  <Plus className="h-4 w-4" />
                  Add New Key
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="总 Key 数" value={stats.total} accent="from-teal-500/20 to-emerald-500/10" />
              <StatCard label="可用数" value={stats.active} accent="from-emerald-500/20 to-lime-500/10" />
              <StatCard label="冷却中数" value={stats.cooling} accent="from-amber-400/20 to-orange-500/10" />
            </div>
          </div>

          <div className="panel fade-up rounded-[32px] p-6 [animation-delay:120ms] sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-[var(--accent-soft)] p-3 text-teal-800">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-stone-500">策略摘要</p>
                <h2 className="text-lg font-semibold text-stone-900">可用性分布</h2>
              </div>
            </div>
            <div className="space-y-4 text-sm text-stone-600">
              <SummaryRow label="活跃池容量" value={`${stats.active}/${stats.total}`} />
              <SummaryRow label="平台覆盖" value="4 providers" />
              <SummaryRow label="自动脱敏展示" value="Enabled" />
            </div>
          </div>
        </section>

        <section className="panel fade-up overflow-hidden rounded-[32px] [animation-delay:220ms]">
          <div className="flex items-center justify-between border-b border-black/6 px-6 py-5 sm:px-8">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-stone-900">API Keys</h2>
              <p className="mt-1 text-sm text-stone-500">按创建时间倒序查看当前密钥池状态，并支持手动重置与删除。</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-xs uppercase tracking-[0.24em] text-stone-500">
                  <th className="px-6 py-4 font-medium sm:px-8">平台</th>
                  <th className="px-6 py-4 font-medium">名称</th>
                  <th className="px-6 py-4 font-medium">Key</th>
                  <th className="px-6 py-4 font-medium">状态</th>
                  <th className="px-6 py-4 font-medium">上次使用</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((item) => {
                  const meta = platformMeta[item.platform];
                  const Icon = meta.icon;
                  const canReset = item.status === "cooling" || item.status === "disabled";

                  return (
                    <tr key={item.id} className="border-t border-black/6 text-sm text-stone-700">
                      <td className="px-6 py-5 sm:px-8">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${meta.tone}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="font-medium text-stone-900">{item.platform}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-stone-600">{item.name}</td>
                      <td className="px-6 py-5 font-medium text-stone-900">{item.keyPreview}</td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyles[item.status]}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-stone-600">{formatLastUsed(item.lastUsedAt)}</td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-2 rounded-full border border-stone-900/10 px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-900/5"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          {canReset ? (
                            <form action={resetKeyStatus.bind(null, item.id)}>
                              <button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-full border border-stone-900/10 px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-900/5"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reset
                              </button>
                            </form>
                          ) : null}
                          <form action={deleteKey.bind(null, item.id)}>
                            <button
                              type="submit"
                              className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 px-4 backdrop-blur-sm">
          <div className="panel w-full max-w-xl rounded-[28px] bg-[var(--surface-strong)] p-6 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-stone-500">Create Key</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-stone-900">Add New Key</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-stone-900/10 p-2 text-stone-500 transition hover:bg-stone-900/5 hover:text-stone-900"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form ref={formRef} className="space-y-5" action={formAction}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Platform</span>
                <select name="platform" defaultValue="OpenAI" className="w-full rounded-2xl border border-stone-900/10 bg-white/80 px-4 py-3 text-stone-900 outline-none transition focus:border-teal-700">
                  {platforms.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Alias</span>
                <input
                  name="name"
                  placeholder="例如：Primary GPT-Prod"
                  className="w-full rounded-2xl border border-stone-900/10 bg-white/80 px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-700"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Secret Key</span>
                <input
                  name="secretKey"
                  placeholder="sk-..."
                  required
                  className="w-full rounded-2xl border border-stone-900/10 bg-white/80 px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-700"
                />
              </label>

              {formState.message ? (
                <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm ${formState.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  <AlertCircle className="h-4 w-4" />
                  {formState.message}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-stone-900/10 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-900/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-teal-800"
                >
                  {isSubmitting ? "Saving..." : "Save Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isEditModalOpen && editingKey ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 px-4 backdrop-blur-sm">
          <div className="panel w-full max-w-xl rounded-[28px] bg-[var(--surface-strong)] p-6 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-stone-500">Edit Key</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-stone-900">Update API Key</h3>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-full border border-stone-900/10 p-2 text-stone-500 transition hover:bg-stone-900/5 hover:text-stone-900"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              key={editingKey.id}
              ref={editFormRef}
              className="space-y-5"
              action={editFormAction}
            >
              <input type="hidden" name="id" value={editingKey.id} />

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Platform</span>
                <select
                  name="platform"
                  defaultValue={editingKey.platform}
                  className="w-full rounded-2xl border border-stone-900/10 bg-white/80 px-4 py-3 text-stone-900 outline-none transition focus:border-teal-700"
                >
                  {platforms.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Alias</span>
                <input
                  name="name"
                  defaultValue={editingKey.name}
                  className="w-full rounded-2xl border border-stone-900/10 bg-white/80 px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-700"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Secret Key (可选)</span>
                <input
                  name="secretKey"
                  placeholder="留空则保持当前 Key 不变"
                  className="w-full rounded-2xl border border-stone-900/10 bg-white/80 px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-700"
                />
              </label>

              {editFormState.message ? (
                <div
                  className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm ${
                    editFormState.success
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                  {editFormState.message}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-full border border-stone-900/10 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-900/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-teal-800"
                >
                  {isEditSubmitting ? "Updating..." : "Update Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className={`rounded-[28px] border border-black/6 bg-gradient-to-br ${accent} p-5`}>
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-stone-900">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-black/6 bg-white/55 px-4 py-3">
      <span>{label}</span>
      <span className="font-semibold text-stone-900">{value}</span>
    </div>
  );
}