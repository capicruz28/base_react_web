// src/utils/icon-utils.tsx
import React from 'react'; // Necesario para JSX y React.ElementType
import * as LucideIcons from 'lucide-react'; // Importa TODO lucide

// Define un tipo para el módulo LucideIcons para mejor seguridad de tipos
type LucideIconSet = typeof LucideIcons;

// Icono por defecto y de error
const DefaultIconComponent = LucideIcons.Circle; // O HelpCircle si prefieres
const ErrorIconComponent = LucideIcons.AlertTriangle;

/**
 * Obtiene dinámicamente un componente de icono de Lucide React por su nombre.
 * @param iconName - El nombre del icono (case-insensitive).
 * @param props - Props adicionales para pasar al componente de icono (ej: size, className).
 * @returns El componente de icono ReactNode o un icono por defecto/error.
 */
export const getIcon = (
    iconName: string | null | undefined,
    props: LucideIcons.LucideProps = { size: 16 } // Props por defecto (tamaño 16)
): React.ReactNode => { // Asegúrate que ReactNode esté bien definido
    // 1. Manejar nombre de icono nulo o indefinido
    if (!iconName) {
        // Devuelve un icono por defecto con opacidad reducida
        return <DefaultIconComponent {...props} className={`${props.className || ''} opacity-50`} />;
    }

    try {
        // 2. Buscar la clave del icono (case-insensitive)
        const iconKey = Object.keys(LucideIcons).find(key => key.toLowerCase() === iconName.toLowerCase());

        // 3. Verificar si se encontró la clave
        if (iconKey) {
            const IconComponent = (LucideIcons as LucideIconSet)[iconKey as keyof LucideIconSet];

            // 4. Verificar si es un componente de icono válido
            if (IconComponent && (typeof IconComponent === 'function' || (typeof IconComponent === 'object' && IconComponent.hasOwnProperty('$$typeof')))) {
                 // ----> ASERCIÓN DE TIPO <----
                 // Le decimos a TypeScript: "Confía en mí, esto es un tipo de componente válido para JSX"
                 const RenderableIcon = IconComponent as React.ElementType;
                 // Renderizar usando la variable con el tipo asegurado
                 return <RenderableIcon {...props} />;
            } else {
                // Si se encontró la clave pero no es un componente válido (raro, pero posible)
                console.warn(`Icono '${iconName}' (clave: ${iconKey}) encontrado pero no es un componente válido.`);
                // Devuelve un icono por defecto con color de advertencia
                return <DefaultIconComponent {...props} className={`${props.className || ''} text-orange-500`} />;
            }
        } else {
            // 5. Icono no encontrado en LucideIcons (el nombre no existe como clave)
            console.warn(`Icono no encontrado en LucideIcons: ${iconName}`);
             // Devuelve un icono por defecto con color de advertencia
            return <DefaultIconComponent {...props} className={`${props.className || ''} text-orange-500`} />;
        }
    } catch (error) {
        // 6. Manejar cualquier otro error inesperado durante la carga o renderizado
        console.error(`Error cargando o renderizando el componente de icono para el nombre: ${iconName}`, error);
         // Devuelve un icono de error con color rojo
        return <ErrorIconComponent {...props} className={`${props.className || ''} text-red-500`} />;
    }
};

// No se necesitan exportar listas de iconos desde aquí si IconSelector maneja su propia lista.