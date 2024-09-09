(await import("child_process")).spawn("bash", [], {
  stdio: ["inherit", "inherit", "inherit", "ipc"],
});
