// 换页时立刻显示的骨架，数据到了再换成真正的内容
export default function Loading() {
  return (
    <div className="animate-pulse pt-2" aria-busy="true" aria-label="加载中">
      <div className="mb-5 h-8 w-32 rounded-xl bg-white/[0.07]" />
      <div className="mb-5 h-36 rounded-3xl bg-white/[0.06]" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[68px] rounded-2xl bg-white/[0.05]" />
        ))}
      </div>
    </div>
  );
}
