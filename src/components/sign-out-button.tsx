"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      className="secondary-action"
      onClick={() => void signOut({ callbackUrl: "/login" })}
    >
      Cerrar sesión
    </button>
  );
}
