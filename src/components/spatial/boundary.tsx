"use client";

import { Component, type ReactNode } from "react";

/** Renders `fallback` (default: nothing) if any child throws, and reports it. */
export class Boundary extends Component<
  { fallback?: ReactNode; onError?: (e: unknown) => void; children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(e: unknown) {
    this.props.onError?.(e);
  }
  render() {
    return this.state.error ? (this.props.fallback ?? null) : this.props.children;
  }
}
