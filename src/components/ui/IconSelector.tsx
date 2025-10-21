// src/components/IconSelector.tsx
import React from 'react';
import Select, { OptionProps, SingleValueProps, components } from 'react-select';
import { getIcon } from '../../lib/icon-utils'; // Ajusta la ruta si es necesario

// Interfaz para las opciones del Select
interface IconOption {
  value: string;
  label: string;
}

// Props del componente IconSelector
interface IconSelectorProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  menuPlacement?: 'auto' | 'bottom' | 'top';
  id?: string;
}

// --- Lista de iconos permitidos (como la definiste) ---
const allowedIconNames: string[] = [
  'AlarmCheck','Album','AlignVerticalDistributeCenter','AlignEndHorizontal','AlignStartVertical','AppWindow',
  'AlertTriangle','BaggageClaim','BarChartBig','BarChartHorizontalBig','BarChart2','Briefcase','BarChart3','Calendar', 
  'Clock','Check','ClipboardList','Edit', 'Eye', 'EyeOff', 'FileText','FileBarChart2','Factory','Home', 
  'HelpCircle','Info','MapPin','Menu','Network','List','ListChecks','ListTodo','LineChart','LogOut', 'LogIn',
  'Plus','Settings','Shirt','ShoppingBag','ScissorsLineDashed','Scissors','Save','Trash2','TrendingUp',
  'TimerReset','Truck','User', 'Users','X'    
  // Añade más si es necesario
];

// Generar las opciones desde la lista permitida
const iconOptions: IconOption[] = allowedIconNames.map(iconName => ({
  value: iconName,
  label: iconName,
}));

// Componente para la opción en el menú (sin cambios)
const IconOptionComponent: React.FC<OptionProps<IconOption, false>> = (props) => (
  <components.Option {...props}>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }}>
        {getIcon(props.data.value, { size: 16 })}
      </span>
      {props.label}
    </div>
  </components.Option>
);

// Componente para el valor seleccionado (sin cambios)
const SingleValueComponent: React.FC<SingleValueProps<IconOption, false>> = (props) => (
  <components.SingleValue {...props}>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }}>
         {getIcon(props.data.value, { size: 16 })}
      </span>
      {props.children}
    </div>
  </components.SingleValue>
);


const IconSelector: React.FC<IconSelectorProps> = ({
  value,
  onChange,
  placeholder = "Seleccionar icono...",
  menuPlacement = 'auto',
  id
}) => {
  const selectedOption = value ? iconOptions.find(option => option.value === value) : null;

  const handleChange = (selected: IconOption | null) => {
    onChange(selected ? selected.value : null);
  };

  // --- *** ESTILOS ACTUALIZADOS CON FONDOS EXPLÍCITOS *** ---
  const customStyles = {
    control: (provided: any, state: { isFocused: any; }) => ({
        ...provided,
        // Fondo del control principal (input)
        backgroundColor: 'var(--select-bg, white)', // Usa variable o blanco por defecto
        borderColor: state.isFocused ? '#6366F1' /* indigo-500 */ : '#D1D5DB' /* gray-300 */,
        '&:hover': { borderColor: '#9CA3AF' /* gray-400 */ },
        boxShadow: state.isFocused ? '0 0 0 1px #6366F1' : 'none',
        color: 'var(--select-text, #111827)', // Color del texto en el control
        minHeight: '38px', // Altura estándar de input de Tailwind
    }),
    input: (provided: any) => ({
        ...provided,
        color: 'var(--select-input-text, #111827)', // Color del texto al escribir
        margin: '0px', // Ajuste fino si es necesario
    }),
    singleValue: (provided: any) => ({
        ...provided,
        color: 'var(--select-text, #111827)', // Color del texto seleccionado
        display: 'flex',
        alignItems: 'center',
    }),
    placeholder: (provided: any) => ({
        ...provided,
        color: 'var(--select-placeholder-text, #6B7280)' /* gray-500 */,
    }),
    menu: (provided: any) => ({
        ...provided,
        // Fondo del menú desplegable
        backgroundColor: 'var(--select-menu-bg, white)', // Usa variable o blanco por defecto
        zIndex: 50,
        border: '1px solid var(--select-menu-border-color, #E5E7EB)' /* gray-200 */,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // Sombra suave
    }),
    option: (provided: any, state: { isSelected: any; isFocused: any; }) => ({
        ...provided,
        // Fondo de cada opción
        backgroundColor: state.isSelected
          ? 'var(--select-option-selected-bg, #4F46E5)' /* indigo-600 */
          : state.isFocused
          ? 'var(--select-option-focused-bg, #EEF2FF)' /* indigo-100 */
          : 'var(--select-menu-bg, white)', // Fondo normal (igual al del menú)
        // Color del texto de cada opción
        color: state.isSelected
          ? 'var(--select-option-selected-text, white)'
          : 'var(--select-option-text, #111827)', // Texto normal
        '&:active': { // Al hacer clic
          backgroundColor: 'var(--select-option-active-bg, #6366F1)' /* indigo-500 */,
        },
        cursor: 'pointer',
        paddingTop: '8px', // Espaciado interno
        paddingBottom: '8px',
    }),
  };
  // --- ******************************************************* ---


  return (
    <Select<IconOption, false>
      id={id}
      options={iconOptions}
      value={selectedOption}
      onChange={handleChange}
      placeholder={placeholder}
      isClearable
      isSearchable
      components={{ Option: IconOptionComponent, SingleValue: SingleValueComponent }}
      styles={customStyles}
      menuPlacement={menuPlacement}
      classNamePrefix="react-select"
    />
  );
};

export default IconSelector;