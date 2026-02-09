export function Metrics() {
  return (
    <section className="bg-[#102216] py-12 md:py-16 border-t border-[#1c2e22]">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-items-center text-center">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <span className="text-[#13ec5b] font-manrope font-extrabold text-5xl md:text-6xl">
              99%
            </span>
            <span className="text-white font-noto font-medium text-lg text-left max-w-[150px]">
              Taxa de
              <br />
              Entrega
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <span className="text-[#13ec5b] font-manrope font-extrabold text-5xl md:text-6xl">
              80%
            </span>
            <span className="text-white font-noto font-medium text-lg text-left max-w-[200px]">
              Redução no
              <br />
              Tempo Operacional
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
