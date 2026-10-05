// App 图标：深祖母绿渐变 + 一圈细金属光泽的环，没有任何文字。
// apple-icon（主屏幕）和 icon（浏览器标签）共用。

export function AppIconArt({ size }: { size: number }) {
  const ring = Math.round(size * 0.46);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(150deg, #1f7a5a 0%, #0f4d3a 45%, #072a21 100%)",
      }}
    >
      <div
        style={{
          width: ring,
          height: ring,
          borderRadius: ring,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(150deg, #e9f5d8 0%, #9fd6b0 40%, #3f9b78 100%)",
        }}
      >
        <div
          style={{
            width: ring - Math.max(2, Math.round(size * 0.045)) * 2,
            height: ring - Math.max(2, Math.round(size * 0.045)) * 2,
            borderRadius: ring,
            background: "linear-gradient(150deg, #14614a 0%, #0a3a2c 100%)",
          }}
        />
      </div>
    </div>
  );
}
