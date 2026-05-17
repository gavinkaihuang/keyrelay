"use client";

import { useMemo } from "react";

export function LocalDateTime({ value }: { value: string }) {
  const formatted = useMemo(() => {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value));
  }, [value]);

  return <>{formatted}</>;
}
