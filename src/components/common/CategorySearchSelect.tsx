import React, { useState, useRef, useEffect } from 'react';

export interface CategoryOption {
  name: string;
  icon: string;
  group?: string;
}

export const GASTO_CATEGORIES: CategoryOption[] = [
  { name: 'Combustible y Gasolina', icon: 'ri-gas-station-line', group: 'Transporte y Movilidad' },
  { name: 'Tiquetes y Pasajes Aéreos/Terrestres', icon: 'ri-flight-takeoff-line', group: 'Transporte y Movilidad' },
  { name: 'Transporte Local, Taxis y Encomiendas', icon: 'ri-taxi-line', group: 'Transporte y Movilidad' },
  { name: 'Papelería, Ligas, Sobres y Empaques', icon: 'ri-archive-line', group: 'Suministros y Oficina' },
  { name: 'Aseo, Limpieza e Insumos', icon: 'ri-sparkling-line', group: 'Suministros y Oficina' },
  { name: 'Dotación y Elementos de Trabajo', icon: 'ri-t-shirt-line', group: 'Suministros y Oficina' },
  { name: 'Arrendamiento y Alquileres', icon: 'ri-building-line', group: 'Instalaciones y Servicios' },
  { name: 'Servicios Públicos (Luz, Agua, Gas)', icon: 'ri-flashlight-line', group: 'Instalaciones y Servicios' },
  { name: 'Internet, Telefonía y Comunicaciones', icon: 'ri-wifi-line', group: 'Instalaciones y Servicios' },
  { name: 'Mantenimiento y Reparaciones Locativas', icon: 'ri-tools-line', group: 'Instalaciones y Servicios' },
  { name: 'Seguridad y Vigilancia Privada', icon: 'ri-shield-keyhole-line', group: 'Instalaciones y Servicios' },
  { name: 'Nómina, Salarios y Prestaciones', icon: 'ri-user-star-line', group: 'Personal y Talento' },
  { name: 'Seguridad Social y Aportes', icon: 'ri-shield-user-line', group: 'Personal y Talento' },
  { name: 'Alimentación, Refrigerios y Cafetería', icon: 'ri-restaurant-line', group: 'Personal y Talento' },
  { name: 'Viáticos, Alojamiento y Hoteles', icon: 'ri-hotel-bed-line', group: 'Personal y Talento' },
  { name: 'Capacitación y Formación', icon: 'ri-book-open-line', group: 'Personal y Talento' },
  { name: 'Honorarios y Servicios Profesionales', icon: 'ri-briefcase-line', group: 'Servicios Administrativos' },
  { name: 'Gastos Legales, Notaría y Registro', icon: 'ri-scales-3-line', group: 'Servicios Administrativos' },
  { name: 'Software, Licencias y Servidores', icon: 'ri-macbook-line', group: 'Tecnología' },
  { name: 'Suscripciones y Servicios Cloud', icon: 'ri-cloud-line', group: 'Tecnología' },
  { name: 'Gastos Financieros, Comisiones y 4x1000', icon: 'ri-bank-card-line', group: 'Finanzas e Impuestos' },
  { name: 'Impuestos, Tasas y Contribuciones', icon: 'ri-government-line', group: 'Finanzas e Impuestos' },
  { name: 'Publicidad, Marketing y Diseño', icon: 'ri-megaphone-line', group: 'Mercadeo y Ventas' },
  { name: 'Caja Menor e Imprevistos Operativos', icon: 'ri-safe-2-line', group: 'Operación y Logística' },
  { name: 'Otros Gastos Operativos', icon: 'ri-more-fill', group: 'Operación y Logística' },
];

export const getCategoryIcon = (categoryName?: string): string => {
  if (!categoryName) return 'ri-price-tag-3-line';
  const found = GASTO_CATEGORIES.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase() ||
           categoryName.toLowerCase().includes(c.name.toLowerCase()) ||
           c.name.toLowerCase().includes(categoryName.toLowerCase())
  );
  if (found) return found.icon;
  if (/combustible|gasolina/i.test(categoryName)) return 'ri-gas-station-line';
  if (/viaje|tiquete|vuelo/i.test(categoryName)) return 'ri-flight-takeoff-line';
  if (/papel|liga|sobre|suministro/i.test(categoryName)) return 'ri-archive-line';
  if (/arriendo|alquiler/i.test(categoryName)) return 'ri-building-line';
  if (/nomina|salario|sueldo/i.test(categoryName)) return 'ri-user-star-line';
  if (/servicio|luz|agua|gas/i.test(categoryName)) return 'ri-flashlight-line';
  if (/banco|financiero|comision|4x1000/i.test(categoryName)) return 'ri-bank-card-line';
  return 'ri-price-tag-3-line';
};

interface CategorySearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const CategorySearchSelect: React.FC<CategorySearchSelectProps> = ({
  value,
  onChange,
  required,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = GASTO_CATEGORIES.filter((cat) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return cat.name.toLowerCase().includes(q) || (cat.group && cat.group.toLowerCase().includes(q));
  });

  const selectedCategory = GASTO_CATEGORIES.find((c) => c.name === value) || (value ? { name: value, icon: getCategoryIcon(value) } : null);

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name="categoria" value={value} required={required} />
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className="w-full min-h-11 rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground flex items-center justify-between gap-2 text-left focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
      >
        <span className="flex items-center gap-2.5 truncate">
          {selectedCategory ? (
            <>
              <i className={`${selectedCategory.icon} text-primary text-base shrink-0`} />
              <span className="font-medium text-foreground">{selectedCategory.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Seleccionar categoría contable…</span>
          )}
        </span>
        <i className="ri-arrow-down-s-line text-muted-foreground shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-border bg-card p-2 shadow-xl animate-fade-in max-h-72 flex flex-col">
          {/* Search Box */}
          <div className="relative mb-2 shrink-0">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar categoría (ej. gasolina, tiquetes, ligas)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* List Options */}
          <div className="overflow-y-auto space-y-1 flex-1">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No se encontró ninguna categoría para "{query}"
              </div>
            ) : (
              filtered.map((cat) => {
                const isSelected = cat.name === value;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      onChange(cat.name);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <i className={`${cat.icon} text-sm ${isSelected ? 'text-primary-foreground' : 'text-primary'}`} />
                      <span className="truncate">{cat.name}</span>
                    </span>
                    {cat.group && (
                      <span className={`text-[10px] shrink-0 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {cat.group}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
