export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
    <div>{eyebrow && <p className="eyebrow mb-2.5 text-info">{eyebrow}</p>}<h1 className="text-[2rem] font-semibold leading-none tracking-[-.045em] sm:text-[2.5rem]">{title}</h1>{description && <p className="mt-2.5 max-w-2xl text-sm leading-6 text-muted">{description}</p>}</div>
    {action && <div className="[&_button]:rounded-full">{action}</div>}
  </div>;
}
