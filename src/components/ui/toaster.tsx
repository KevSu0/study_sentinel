"use client"

import { Toaster as HotToaster } from "react-hot-toast"

export function Toaster() {
  return (
    <HotToaster
      position="top-center"
      toastOptions={{
        duration: 3000,
      }}
    />
  )
}
