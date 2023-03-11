# vtools

Simple GUI wrapping some of my frequently used ffmpeg commands.

I'm just getting tired of typing commands into terminal when doing simple video cutting tasks.
This is not a full-featured ffmpeg wrapper, it's tailored specifically to my own needs.

# Project structure

This is a pretty standard tauri app based on the official Tauri + Svelte + Typescript template.

- `src` contains the UI code. It's Svelte + Typescript
- `src-tauri` contains the native part. It's a standard Rust project.

# Dev & release

- Just `yarn tauri dev` to launch development instance.
- `yarn tauri build` to build a release.

# Notice

I don't use Windows anymore, so it's unlikely to work (or even compile) on Windows. PRs are welcomed, though.
