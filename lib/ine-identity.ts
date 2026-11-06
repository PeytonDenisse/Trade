// Private data declared by an applicant. A structurally valid CURP does not
// prove that the identifier belongs to the person or that the INE is genuine.
export type IneIdentity = {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  sexo: 'H' | 'M' | 'NB';
  curp: string;
  calleNumero: string;
  colonia: string;
  codigoPostal: string;
  municipio: string;
  estado: string;
  vigencia: string;
};

export type IneDraft = Omit<IneIdentity, 'sexo'> & { sexo: '' | 'H' | 'M' | 'NB' };
export const emptyIneDraft: IneDraft = {
  nombres: '', apellidoPaterno: '', apellidoMaterno: '', fechaNacimiento: '', sexo: '',
  curp: '', calleNumero: '', colonia: '', codigoPostal: '', municipio: '', estado: '', vigencia: '',
};

const fields = [
  'nombres', 'apellidoPaterno', 'apellidoMaterno', 'fechaNacimiento', 'sexo',
  'curp', 'calleNumero', 'colonia', 'codigoPostal', 'municipio', 'estado', 'vigencia',
] as const;
const states = new Set('AS BC BS CC CL CM CS CH DF DG GT GR HG JC MC MN MS NT NL OC PL QT QR SP SL SR TC TS TL VZ YN ZS NE'.split(' '));
// The 18 positions have letters, a six-digit date, H/M/X, state, consonants,
// authority-assigned character and check digit. This only checks structure.
const curpShape = /^[A-ZÑ&][AEIOUX][A-ZÑ&]{2}\d{6}[HMX][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\d$/;

function text(value: unknown, label: string, max: number, optional = false): string {
  if (typeof value !== 'string') throw new Error(`${label}: escribe un texto válido.`);
  const clean = value.replace(/\s+/gu, ' ').trim();
  if ((!optional && !clean) || clean.length > max || /[\u0000-\u001f\u007f]/u.test(clean))
    throw new Error(`${label}: completa el campo (máximo ${max} caracteres).`);
  return clean;
}

function birthDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error('Fecha de nacimiento: usa el formato AAAA-MM-DD.');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (value.startsWith('0000') || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value || value > new Date().toISOString().slice(0, 10))
    throw new Error('Fecha de nacimiento: selecciona una fecha real que no sea futura.');
  return value;
}

function validity(value: unknown): string {
  const clean = text(value, 'Vigencia del INE', 16).replace(/\s*[-–]\s*/gu, '-');
  if (!/^(?:19|20|21)\d{2}(?:-(?:19|20|21)\d{2})?$/.test(clean))
    throw new Error('Vigencia del INE: indica el año o periodo impreso, por ejemplo 2030 o 2020-2030.');
  const [start, end] = clean.split('-').map(Number);
  if (end !== undefined && end < start)
    throw new Error('Vigencia del INE: el año final debe ser igual o posterior al inicial.');
  return clean;
}

function curpValue(value: unknown): string {
  const curp = typeof value === 'string' ? value.replace(/\s+/gu, '').toUpperCase() : '';
  if (curp.length !== 18 || !curpShape.test(curp) || !states.has(curp.slice(11, 13)))
    throw new Error('CURP: verifica sus 18 caracteres y su estructura.');
  const year = Number(curp.slice(4, 6));
  const month = Number(curp.slice(6, 8));
  const day = Number(curp.slice(8, 10));
  // The authority's seventeenth character distinguishes many pre/post-2000
  // records. Accept either century for the calendar check to avoid excluding
  // historic exceptions; the date is still only a structural check.
  const realDay = [1900 + year, 2000 + year].some(fullYear => {
    const parsed = new Date(Date.UTC(fullYear, month - 1, day));
    return parsed.getUTCFullYear() === fullYear && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  });
  if (!realDay) throw new Error('CURP: la fecha contenida en la clave no es válida.');
  return curp;
}

function postalCode(value: unknown): string {
  const clean = text(value, 'Código postal', 5);
  if (!/^\d{5}$/.test(clean)) throw new Error('Código postal: escribe cinco dígitos.');
  return clean;
}

function sexValue(value: unknown): 'H' | 'M' | 'NB' {
  if (value !== 'H' && value !== 'M' && value !== 'NB') throw new Error('Sexo o género: selecciona una opción válida.');
  return value;
}

const checks: { [K in keyof IneIdentity]: (value: unknown) => IneIdentity[K] } = {
  nombres: value => text(value, 'Nombre(s)', 100),
  apellidoPaterno: value => text(value, 'Apellido paterno', 100),
  apellidoMaterno: value => text(value ?? '', 'Apellido materno', 100, true),
  fechaNacimiento: birthDate,
  sexo: sexValue,
  curp: curpValue,
  calleNumero: value => text(value, 'Calle y número', 200),
  colonia: value => text(value, 'Colonia', 120),
  codigoPostal: postalCode,
  municipio: value => text(value, 'Municipio o alcaldía', 120),
  estado: value => text(value, 'Estado', 100),
  vigencia: validity,
};

export function ineIdentityErrors(input: unknown): Partial<Record<keyof IneIdentity, string>> {
  const source = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown> : {};
  const errors: Partial<Record<keyof IneIdentity, string>> = {};
  for (const field of fields) {
    try { checks[field](source[field]); }
    catch (cause) { errors[field] = cause instanceof Error ? cause.message : 'Revisa este dato.'; }
  }
  // A credential marked GÉNERO NB can carry a CURP with H, M or X.
  if (!errors.curp && !errors.sexo && source.sexo !== 'NB' && (source.curp as string).replace(/\s+/gu, '').toUpperCase()[10] !== source.sexo)
    errors.curp = 'CURP: el marcador de sexo no coincide con el dato seleccionado.';
  if (!errors.curp && !errors.fechaNacimiento) {
    const curp = (source.curp as string).replace(/\s+/gu, '').toUpperCase();
    const birth = source.fechaNacimiento as string;
    if (curp.slice(4, 10) !== birth.slice(2).replaceAll('-', ''))
      errors.curp = 'CURP: la fecha contenida en la clave no coincide con la fecha de nacimiento.';
  }
  return errors;
}

export function validateIneIdentity(input: unknown): IneIdentity {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.getPrototypeOf(input) !== Object.prototype)
    throw new Error('Completa los datos de identificación.');
  const source = input as Record<string, unknown>;
  if (Object.keys(source).some(key => !fields.includes(key as typeof fields[number])))
    throw new Error('Los datos de identificación contienen campos no permitidos.');
  const errors = ineIdentityErrors(source);
  const first = fields.find(field => errors[field]);
  if (first) throw new Error(errors[first]);
  return {
    nombres: checks.nombres(source.nombres),
    apellidoPaterno: checks.apellidoPaterno(source.apellidoPaterno),
    apellidoMaterno: checks.apellidoMaterno(source.apellidoMaterno),
    fechaNacimiento: checks.fechaNacimiento(source.fechaNacimiento),
    sexo: checks.sexo(source.sexo),
    curp: checks.curp(source.curp),
    calleNumero: checks.calleNumero(source.calleNumero),
    colonia: checks.colonia(source.colonia),
    codigoPostal: checks.codigoPostal(source.codigoPostal),
    municipio: checks.municipio(source.municipio),
    estado: checks.estado(source.estado),
    vigencia: checks.vigencia(source.vigencia),
  };
}
