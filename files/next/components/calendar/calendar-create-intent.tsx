"use client";

// ?action=create is only handled by ResourcePage when the resource uses
// formView "page" or "page-steps". Default resources open a sheet from local
// state instead, so the URL alone used to land on the list with nothing open.
// This bridge runs on the resource page and opens that same sheet for the
// default formView, then clears the query parameter.

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ControllerLike {
  isFormPage: boolean;
  create: () => void;
}

export function CalendarCreateIntent({
  controller,
  slug,
}: {
  controller: ControllerLike;
  slug: string;
}) {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (params.get("action") !== "create") return;
    // Page modes already render the form from the URL. Leave their param alone.
    if (controller.isFormPage) return;
    controller.create();
    router.replace(`/resources/${slug}`);
  }, [params, router, controller, slug]);

  return null;
}
