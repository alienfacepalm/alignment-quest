/**
 * pnpm nests expo-modules-core under .pnpm; patch-package is awkward here.
 * These edits fix iOS build failures (Swift 5.9 + strict concurrency) on common Xcode setups.
 * Idempotent: safe to run multiple times.
 */
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const candidatePaths = [
  path.join(repoRoot, "node_modules", "expo-modules-core", "package.json"),
  path.join(repoRoot, "node_modules", ".pnpm", "node_modules", "expo-modules-core", "package.json"),
];

let base;
for (const pkg of candidatePaths) {
  if (fs.existsSync(pkg)) {
    base = path.dirname(pkg);
    break;
  }
}
if (!base) {
  try {
    base = path.dirname(require.resolve("expo-modules-core/package.json", { paths: [repoRoot] }));
  } catch {
    // ignore
  }
}
if (!base) {
  console.warn("apply-expo-ios-patches: expo-modules-core not found, skipping.");
  process.exit(0);
}

function patchFile(rel, replacers) {
  const p = path.join(base, rel);
  if (!fs.existsSync(p)) {
    console.warn("apply-expo-ios-patches: missing", rel);
    return;
  }
  let s = fs.readFileSync(p, "utf8");
  const before = s;
  for (const { from, to } of replacers) {
    if (typeof from === "string" && s.includes(from)) {
      s = s.split(from).join(to);
    } else if (from instanceof RegExp) {
      s = s.replace(from, to);
    }
  }
  if (s !== before) {
    fs.writeFileSync(p, s);
    console.log("apply-expo-ios-patches: updated", rel);
  }
}

// 1) Swift 6 surface syntax: `extension T: @MainActor P` -> `@MainActor` on previous line
patchFile("ios/Core/Views/ViewDefinition.swift", [
  { from: "extension UIView: @MainActor AnyArgument {", to: "@MainActor\nextension UIView: AnyArgument {" },
]);

patchFile("ios/Core/Views/SwiftUI/SwiftUIVirtualView.swift", [
  {
    from: "extension ExpoSwiftUI.SwiftUIVirtualView: @MainActor ExpoSwiftUI.ViewWrapper {",
    to: "@MainActor\nextension ExpoSwiftUI.SwiftUIVirtualView: ExpoSwiftUI.ViewWrapper {",
  },
]);

// 2) Class avoids `, @MainActor Proto` in inheritance; protocol stays nonisolated so dynamic casts can call getContentView() on main thread without @MainActor protocol.
patchFile("ios/Core/Views/SwiftUI/SwiftUIHostingView.swift", [
  {
    from:
      "  public final class HostingView<Props: ViewProps, ContentView: View<Props>>: ExpoView, @MainActor AnyExpoSwiftUIHostingView {",
    to:
      "  @MainActor\n  public final class HostingView<Props: ViewProps, ContentView: View<Props>>: ExpoView, AnyExpoSwiftUIHostingView {",
  },
  { from: "@MainActor\ninternal protocol AnyExpoSwiftUIHostingView {", to: "internal protocol AnyExpoSwiftUIHostingView {" },
]);

// 3) MainActor-isolated UIKit initializer in a nonisolated path
patchFile("ios/ReactDelegates/ExpoReactDelegate.swift", [
  {
    from: "  @objc\n  public func createRootViewController() -> UIViewController {",
    to: "  @objc\n  @MainActor\n  public func createRootViewController() -> UIViewController {",
  },
]);

// 4) Sendable / closure issues in file log
patchFile("ios/Core/Logging/PersistentFileLog.swift", [
  {
    from: "        let newcontents = contents.filter { entry in filter(entry) }",
    to: "        let entryFilter = filter\n        let newcontents = contents.filter { entry in entryFilter(entry) }",
  },
]);

// 5) Swift 6 strict Sendable on NSObject helpers
patchFile("ios/DevTools/URLAuthenticationChallengeForwardSender.swift", [
  {
    from: "internal final class URLAuthenticationChallengeForwardSender: NSObject, URLAuthenticationChallengeSender {",
    to: "internal final class URLAuthenticationChallengeForwardSender: NSObject, URLAuthenticationChallengeSender, @unchecked Sendable {",
  },
]);

patchFile("ios/DevTools/URLSessionSessionDelegateProxy.swift", [
  {
    from: "public final class URLSessionSessionDelegateProxy: NSObject, URLSessionDataDelegate {",
    to: "public final class URLSessionSessionDelegateProxy: NSObject, URLSessionDataDelegate, @unchecked Sendable {",
  },
]);

// 6) @MainActor on override vs nonisolated base — remove attribute from overrides
patchFile("ios/Core/Views/SwiftUI/SwiftUIVirtualView.swift", [
  { from: "    @MainActor\n    override func updateProps(_ rawProps: [String: Any]) {", to: "    override func updateProps(_ rawProps: [String: Any]) {" },
  { from: "    @MainActor\n    func getProps() -> ExpoSwiftUI.ViewProps {", to: "    func getProps() -> ExpoSwiftUI.ViewProps {" },
  { from: "    @MainActor\n    override func viewDidUpdateProps() {", to: "    override func viewDidUpdateProps() {" },
  { from: "    @MainActor\n    override func mountChildComponentView", to: "    override func mountChildComponentView" },
  { from: "    @MainActor\n    override func unmountChildComponentView", to: "    override func unmountChildComponentView" },
  { from: "    @MainActor\n    override func removeFromSuperview() {", to: "    override func removeFromSuperview() {" },
]);

// 7) Frame in Sendable closure: capture value before async callback
patchFile("ios/Core/Views/SwiftUI/SwiftUIViewFrameObserver.swift", [
  {
    from: "        callback(CGRect(origin: view.frame.origin, size: newValue.size))",
    to: "        let origin = view.frame.origin\n        callback(CGRect(origin: origin, size: newValue.size))",
  },
]);

// 8) expo-dev-launcher: Swift 6 actor isolation in delegate callback
// pnpm nests expo-dev-launcher under .pnpm; patch it similarly to expo-modules-core.
function resolvePkgBase(pkgName) {
  const pkgCandidates = [
    path.join(repoRoot, "node_modules", pkgName, "package.json"),
    path.join(repoRoot, "node_modules", ".pnpm", "node_modules", pkgName, "package.json"),
  ];

  for (const pkg of pkgCandidates) {
    if (fs.existsSync(pkg)) return path.dirname(pkg);
  }

  try {
    return path.dirname(require.resolve(`${pkgName}/package.json`, { paths: [repoRoot] }));
  } catch {
    return null;
  }
}

const devLauncherBase = resolvePkgBase("expo-dev-launcher");
if (!devLauncherBase) {
  console.warn("apply-expo-ios-patches: expo-dev-launcher not found, skipping.");
} else {
  const previousBase = base;
  base = devLauncherBase;

  // Ensure devLauncherController runs on main actor so it can call createRootViewController().
  patchFile("ios/ReactDelegateHandler/ExpoDevLauncherReactDelegateHandler.swift", [
    {
      from:
        "  public func devLauncherController(_ developmentClientController: EXDevLauncherController, didStartWithSuccess success: Bool) {",
      to:
        "  @MainActor\n  public func devLauncherController(_ developmentClientController: EXDevLauncherController, didStartWithSuccess success: Bool) {",
    },
  ]);

  base = previousBase;
}
