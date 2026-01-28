import { Combobox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { Fragment, useEffect, useState } from 'react'
import { useFormValidation, useInputLabel, useInputValue } from '@/form-control'
import { format, formatInTimeZone } from 'date-fns-tz'

import { cn } from '@/utils/cn'

import Loading from '@/components/Loading'

import { ISelectOption, OptionsListConfig } from '../hooks'
import { FieldProps } from './BaseField'

export type TimeZoneFieldProps<FormValuesType> = FieldProps<string, FormValuesType> & {
    options?: SearchableSelectOption[]
    optionsListConfig?: OptionsListConfig
    createNewOptionFromQuery?: (queryString: string) => Promise<void>
}

export default function TimeZoneField<FormValuesType = any>({
    options,
    optionsListConfig,
    createNewOptionFromQuery,
    defaultValue,
    // Inside FormWrapper
    field,
    formValues,
    setFormValues,
    formOptions,
    // Standalone
    value,
    onChange,
    //
    label,
    containerClass,
    labelClass,
    inputClass,
    ...rest
}: TimeZoneFieldProps<FormValuesType>) {
    if (rest && Object.keys(rest).filter((d) => !['required', 'placeholder'].includes(d)).length > 0) {
        console.warn('TimeZoneField does not use a HTML Input component, so additional props are not supported.')
    }

    const { inputLabel } = useInputLabel(label, field, formOptions)
    const { inputValue, handleChange } = useInputValue<string>(
        value,
        onChange,
        field,
        formValues,
        setFormValues,
        formOptions
    )
    const { isValid, ValidationPrompt } = useFormValidation(formValues ?? {}, inputValue, field, formOptions)

    const [query, setQuery] = useState('')
    const [filtered, setFiltered] = useState<SearchableSelectOption[]>([])

    useEffect(() => {
        setFiltered(
            query === ''
                ? fullTimeZoneOptions
                : fullTimeZoneOptions?.filter((option) => {
                      let searchString = [option.text, option.value, ...(option?.searchTerms ?? [])].join(' ')
                      return stringContains(searchString, query)
                  })
        )
    }, [query, fullTimeZoneOptions])

    if (!fullTimeZoneOptions) return <Loading size={24} />

    return (
        <div className={cn('field-container', containerClass)}>
            {inputLabel && (
                <label className={cn('field-label', labelClass, 'flex justify-between items-end')}>
                    <p>
                        {inputLabel} {rest?.required && <span className='text-red-500'>*</span>}
                    </p>
                    <p className='mb-1 mr-1 text-sm text-gray-500'>Your Time: {format(Date.now(), 'h:mm aaa O')}</p>
                </label>
            )}
            <Combobox
                value={getComboboxValue(fullTimeZoneOptions, inputValue, String(defaultValue))}
                onChange={(option: SearchableSelectOption) => handleChange(option.value)}
            >
                <div className='relative text-left cursor-default focus:outline-none'>
                    <Combobox.Input
                        placeholder={rest?.placeholder ?? 'Select...'}
                        className={cn(
                            'field-input',
                            inputClass,
                            isValid ? '' : 'ring-amber-600 focus-within:ring-amber-600'
                        )}
                        onChange={(e) => setQuery(e.target.value)}
                        displayValue={(option: SearchableSelectOption) =>
                            `${option.text} - ${formatInTimeZone(Date.now(), option.value, 'h:mm a')}`
                        }
                        required={rest?.required}
                    />
                    <Combobox.Button className='absolute inset-y-0 right-0 flex items-center pr-2'>
                        <ChevronUpDownIcon className='w-5 h-5 text-gray-400' aria-hidden='true' />
                    </Combobox.Button>
                </div>
                <div className='relative'>
                    <Transition
                        as={Fragment}
                        leave='transition ease-in duration-100'
                        leaveFrom='opacity-100'
                        leaveTo='opacity-0'
                        afterLeave={() => setQuery('')}
                    >
                        <Combobox.Options className='absolute z-[100] w-full py-2 mt-2 text-base shadow-xl bg-white focus:outline-none max-h-64 overflow-y-auto'>
                            {filtered?.map((option, idx) => (
                                <Combobox.Option
                                    key={option.value + option.text + idx}
                                    value={option}
                                    className={({ active }) =>
                                        cn(
                                            'relative cursor-default select-none py-2 px-3',
                                            active ? 'bg-brand-400 text-white' : 'text-gray-700',
                                            option.value === inputValue && 'bg-brand-600 text-white'
                                        )
                                    }
                                >
                                    {option.text} - {formatInTimeZone(Date.now(), option.value, 'h:mm a')}
                                </Combobox.Option>
                            ))}
                        </Combobox.Options>
                    </Transition>
                </div>
            </Combobox>
            <ValidationPrompt />
        </div>
    )
}

function getComboboxValue(
    zoneOptions: SearchableSelectOption[],
    inputValue?: string,
    defaultValue?: string
): SearchableSelectOption | string {
    let inputValueMatch: SearchableSelectOption | null = null
    let defaultValueMatch: SearchableSelectOption | null = null

    let searchString: string
    for (const option of zoneOptions) {
        searchString = [option.text, option.value, ...(option?.searchTerms ?? [])].join(' ')
        if (inputValue && stringContains(searchString, inputValue)) {
            inputValueMatch = option
        }
        if (defaultValue && stringContains(searchString, defaultValue)) {
            defaultValueMatch = option
        }
    }

    return inputValueMatch ?? defaultValueMatch ?? zoneOptions[0]
}

function stringContains(input: string, searchTerm: string): boolean {
    const regex = new RegExp(searchTerm.replace(/[_\s]+/g, ''), 'i') // 'i' for case-insensitive matching
    return regex.test(input.replace(/[_\s]+/g, ''))
}

type SearchableSelectOption = {
    searchTerms?: Array<string>
} & ISelectOption

// TimeZoneOptions from https://github.com/dmfilipenko/timezones.json/blob/master/timezones.json
// TimeZoneField should accept major cities in that timezone.  Additional cities can be added to the searchTerms for that timezone.
export const fullTimeZoneOptions: SearchableSelectOption[] = [
    {
        value: 'America/Detroit',
        text: 'Eastern Time',
        searchTerms: [
            'America/Detroit',
            'America/Havana',
            'America/Indiana/Petersburg',
            'America/Indiana/Vincennes',
            'America/Indiana/Winamac',
            'America/Iqaluit',
            'America/Kentucky/Monticello',
            'America/Louisville',
            'America/Montreal',
            'America/Nassau',
            'America/New_York',
            'America/Nipigon',
            'America/Pangnirtung',
            'America/Port-au-Prince',
            'America/Thunder_Bay',
            'America/Toronto',
            'America/Indiana/Marengo',
            'America/Indiana/Vevay',
            'America/Indianapolis',
        ],
    },
    {
        value: 'America/Anchorage',
        text: 'Alaska Time',
        searchTerms: ['America/Anchorage', 'America/Juneau', 'America/Nome', 'America/Sitka', 'America/Yakutat'],
    },
    {
        value: 'America/Santa_Isabel',
        text: 'Pacific Time',
        searchTerms: ['America/Santa_Isabel', 'America/Los_Angeles', 'America/Tijuana', 'America/Vancouver', 'PST8PDT'],
    },
    {
        value: 'America/Creston',
        text: 'Mountain Time',
        searchTerms: [
            'America/Creston',
            'America/Dawson',
            'America/Dawson_Creek',
            'America/Hermosillo',
            'America/Phoenix',
            'America/Whitehorse',
            'Etc/GMT+7',
            'America/Boise',
            'America/Cambridge_Bay',
            'America/Denver',
            'America/Edmonton',
            'America/Inuvik',
            'America/Ojinaga',
            'America/Yellowknife',
            'MST7MDT',
        ],
    },
    {
        value: 'America/Chihuahua',
        text: 'Central Time',
        searchTerms: [
            'America/Chihuahua',
            'America/Mazatlan',
            'America/Belize',
            'America/Costa_Rica',
            'America/El_Salvador',
            'America/Guatemala',
            'America/Managua',
            'America/Tegucigalpa',
            'Etc/GMT+6',
            'Pacific/Galapagos',
            'America/Chicago',
            'America/Indiana/Knox',
            'America/Indiana/Tell_City',
            'America/Matamoros',
            'America/Menominee',
            'America/North_Dakota/Beulah',
            'America/North_Dakota/Center',
            'America/North_Dakota/New_Salem',
            'America/Rainy_River',
            'America/Rankin_Inlet',
            'America/Resolute',
            'America/Winnipeg',
            'CST6CDT',
            'America/Bahia_Banderas',
            'America/Cancun',
            'America/Merida',
            'America/Mexico_City',
            'America/Monterrey',
            'America/Regina',
            'America/Swift_Current',
        ],
    },
    {
        value: 'America/Bogota',
        text: 'Colombia Time',
        searchTerms: [
            'America/Bogota',
            'America/Cayman',
            'America/Coral_Harbour',
            'America/Eirunepe',
            'America/Guayaquil',
            'America/Jamaica',
            'America/Lima',
            'America/Panama',
            'America/Rio_Branco',
            'Etc/GMT+5',
        ],
    },
    {
        value: 'America/Caracas',
        text: 'Venezuela Time',
        searchTerms: [
            'America/Caracas',
            'America/Asuncion',
            'America/Campo_Grande',
            'America/Cuiaba',
            'America/Santiago',
            'Antarctica/Palmer',
        ],
    },
    {
        value: 'America/Glace_Bay',
        text: 'Atlantic Time',
        searchTerms: [
            'America/Glace_Bay',
            'America/Goose_Bay',
            'America/Halifax',
            'America/Moncton',
            'America/Thule',
            'Atlantic/Bermuda',
            'America/Anguilla',
            'America/Antigua',
            'America/Aruba',
            'America/Barbados',
            'America/Blanc-Sablon',
            'America/Boa_Vista',
            'America/Curacao',
            'America/Dominica',
            'America/Grand_Turk',
            'America/Grenada',
            'America/Guadeloupe',
            'America/Guyana',
            'America/Kralendijk',
            'America/La_Paz',
            'America/Lower_Princes',
            'America/Manaus',
            'America/Marigot',
            'America/Martinique',
            'America/Montserrat',
            'America/Port_of_Spain',
            'America/Porto_Velho',
            'America/Puerto_Rico',
            'America/Santo_Domingo',
            'America/St_Barthelemy',
            'America/St_Kitts',
            'America/St_Lucia',
            'America/St_Thomas',
            'America/St_Vincent',
            'America/Tortola',
            'Etc/GMT+4',
        ],
    },
    { value: 'America/St_Johns', text: 'Newfoundland Time', searchTerms: ['America/St_Johns'] },
    {
        value: 'America/Sao_Paulo',
        text: 'Brasilia Time',
        searchTerms: [
            'America/Sao_Paulo',
            'America/Araguaina',
            'America/Belem',
            'America/Cayenne',
            'America/Fortaleza',
            'America/Maceio',
            'America/Paramaribo',
            'America/Recife',
            'America/Santarem',
            'Antarctica/Rothera',
            'Atlantic/Stanley',
            'Etc/GMT+3',
            'America/Bahia',
        ],
    },
    {
        value: 'America/Argentina/Buenos_Aires',
        text: 'Argentina Time',
        searchTerms: [
            'America/Argentina/Buenos_Aires',
            'America/Argentina/Catamarca',
            'America/Argentina/Cordoba',
            'America/Argentina/Jujuy',
            'America/Argentina/La_Rioja',
            'America/Argentina/Mendoza',
            'America/Argentina/Rio_Gallegos',
            'America/Argentina/Salta',
            'America/Argentina/San_Juan',
            'America/Argentina/San_Luis',
            'America/Argentina/Tucuman',
            'America/Argentina/Ushuaia',
            'America/Buenos_Aires',
            'America/Catamarca',
            'America/Cordoba',
            'America/Jujuy',
            'America/Mendoza',
            'America/Montevideo',
        ],
    },
    {
        value: 'America/Godthab',
        text: 'GMT-01:00',
        searchTerms: ['America/Godthab', 'America/Scoresbysund', 'Atlantic/Azores'],
    },
    {
        value: 'America/Noronha',
        text: 'Fernando de Noronha Time',
        searchTerms: ['America/Noronha', 'Atlantic/South_Georgia', 'Etc/GMT+2'],
    },
    {
        value: 'Europe/London',
        text: 'Western European Time',
        searchTerms: [
            'Europe/Isle_of_Man',
            'Europe/London',
            'Europe/Jersey',
            'Europe/Guernsey',
            'Atlantic/Canary',
            'Atlantic/Faeroe',
            'Atlantic/Madeira',
            'Europe/Dublin',
            'Europe/Lisbon',
        ],
    },
    { value: 'Atlantic/Cape_Verde', text: 'Cape Verde Time', searchTerms: ['Atlantic/Cape_Verde', 'Etc/GMT+1'] },
    {
        value: 'America/Danmarkshavn',
        text: 'Greenwich Mean Time',
        searchTerms: [
            'America/Danmarkshavn',
            'Etc/GMT',
            'Africa/Abidjan',
            'Africa/Accra',
            'Africa/Bamako',
            'Africa/Banjul',
            'Africa/Bissau',
            'Africa/Conakry',
            'Africa/Dakar',
            'Africa/Freetown',
            'Africa/Lome',
            'Africa/Monrovia',
            'Africa/Nouakchott',
            'Africa/Ouagadougou',
            'Africa/Sao_Tome',
            'Atlantic/Reykjavik',
            'Atlantic/St_Helena',
        ],
    },
    {
        value: 'Arctic/Longyearbyen',
        text: 'Central European Time',
        searchTerms: [
            'Arctic/Longyearbyen',
            'Europe/Amsterdam',
            'Europe/Andorra',
            'Europe/Berlin',
            'Europe/Busingen',
            'Europe/Gibraltar',
            'Europe/Luxembourg',
            'Europe/Malta',
            'Europe/Monaco',
            'Europe/Oslo',
            'Europe/Rome',
            'Europe/San_Marino',
            'Europe/Stockholm',
            'Europe/Vaduz',
            'Europe/Vatican',
            'Europe/Vienna',
            'Europe/Zurich',
            'Europe/Belgrade',
            'Europe/Bratislava',
            'Europe/Budapest',
            'Europe/Ljubljana',
            'Europe/Podgorica',
            'Europe/Prague',
            'Europe/Tirane',
            'Africa/Ceuta',
            'Europe/Brussels',
            'Europe/Copenhagen',
            'Europe/Madrid',
            'Europe/Paris',
            'Europe/Sarajevo',
            'Europe/Skopje',
            'Europe/Warsaw',
            'Europe/Zagreb',
            'Africa/Tripoli',
            'Europe/Kaliningrad',
        ],
    },
    {
        value: 'Africa/Algiers',
        text: 'West Africa Time',
        searchTerms: [
            'Africa/Algiers',
            'Africa/Bangui',
            'Africa/Brazzaville',
            'Africa/Douala',
            'Africa/Kinshasa',
            'Africa/Lagos',
            'Africa/Libreville',
            'Africa/Luanda',
            'Africa/Malabo',
            'Africa/Ndjamena',
            'Africa/Niamey',
            'Africa/Porto-Novo',
            'Africa/Tunis',
            'Etc/GMT-1',
        ],
    },
    {
        value: 'Africa/Windhoek',
        text: 'Central Africa Time',
        searchTerms: [
            'Africa/Windhoek',
            'Africa/Blantyre',
            'Africa/Bujumbura',
            'Africa/Gaborone',
            'Africa/Harare',
            'Africa/Johannesburg',
            'Africa/Kigali',
            'Africa/Lubumbashi',
            'Africa/Lusaka',
            'Africa/Maputo',
            'Africa/Maseru',
            'Africa/Mbabane',
            'Etc/GMT-2',
        ],
    },
    {
        value: 'Asia/Nicosia',
        text: 'Eastern European Time',
        searchTerms: [
            'Asia/Nicosia',
            'Europe/Athens',
            'Europe/Bucharest',
            'Europe/Chisinau',
            'Asia/Beirut',
            'Africa/Cairo',
            'Europe/Helsinki',
            'Europe/Kyiv',
            'Europe/Mariehamn',
            'Europe/Nicosia',
            'Europe/Riga',
            'Europe/Sofia',
            'Europe/Tallinn',
            'Europe/Uzhgorod',
            'Europe/Vilnius',
            'Europe/Zaporozhye',
        ],
    },
    {
        value: 'Asia/Damascus',
        text: 'GMT+03:00',
        searchTerms: [
            'Asia/Damascus',
            'Europe/Istanbul',
            'Asia/Amman',
            'Europe/Kirov',
            'Europe/Moscow',
            'Europe/Simferopol',
            'Europe/Volgograd',
            'Europe/Minsk',
        ],
    },
    { value: 'Asia/Jerusalem', text: 'Israel Time', searchTerms: ['Asia/Jerusalem'] },
    {
        value: 'Asia/Baghdad',
        text: 'Arabian Time',
        searchTerms: ['Asia/Baghdad', 'Asia/Aden', 'Asia/Bahrain', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Riyadh'],
    },
    {
        value: 'Africa/Addis_Ababa',
        text: 'East Africa Time',
        searchTerms: [
            'Africa/Addis_Ababa',
            'Africa/Asmera',
            'Africa/Dar_es_Salaam',
            'Africa/Djibouti',
            'Africa/Juba',
            'Africa/Kampala',
            'Africa/Khartoum',
            'Africa/Mogadishu',
            'Africa/Nairobi',
            'Antarctica/Syowa',
            'Etc/GMT-3',
            'Indian/Antananarivo',
            'Indian/Comoro',
            'Indian/Mayotte',
        ],
    },
    {
        value: 'Europe/Astrakhan',
        text: 'GMT+04:00',
        searchTerms: ['Europe/Astrakhan', 'Europe/Samara', 'Europe/Ulyanovsk'],
    },
    { value: 'Asia/Tehran', text: 'Iran Time', searchTerms: ['Asia/Tehran'] },
    {
        value: 'Asia/Dubai',
        text: 'Gulf Time',
        searchTerms: [
            'Asia/Dubai',
            'Asia/Muscat',
            'Etc/GMT-4',
            'Asia/Baku',
            'Indian/Mahe',
            'Indian/Mauritius',
            'Indian/Reunion',
            'Asia/Tbilisi',
            'Asia/Yerevan',
        ],
    },
    { value: 'Asia/Kabul', text: 'Afghanistan Time', searchTerms: ['Asia/Kabul'] },
    {
        value: 'Antarctica/Mawson',
        text: 'Mawson Time',
        searchTerms: [
            'Antarctica/Mawson',
            'Asia/Aqtau',
            'Asia/Aqtobe',
            'Asia/Ashgabat',
            'Asia/Dushanbe',
            'Asia/Oral',
            'Asia/Samarkand',
            'Asia/Tashkent',
            'Etc/GMT-5',
            'Indian/Kerguelen',
            'Indian/Maldives',
        ],
    },
    { value: 'Asia/Karachi', text: 'Pakistan Time', searchTerms: ['Asia/Karachi', 'Asia/Yekaterinburg'] },
    { value: 'Asia/Kolkata', text: 'India Time', searchTerms: ['Asia/Kolkata', 'Asia/Calcutta', 'Asia/Colombo'] },
    { value: 'Asia/Kathmandu', text: 'Nepal Time', searchTerms: ['Asia/Kathmandu'] },
    {
        value: 'Antarctica/Vostok',
        text: 'Vostok Time',
        searchTerms: [
            'Antarctica/Vostok',
            'Asia/Almaty',
            'Asia/Bishkek',
            'Asia/Qyzylorda',
            'Asia/Urumqi',
            'Etc/GMT-6',
            'Indian/Chagos',
        ],
    },
    { value: 'Asia/Dhaka', text: 'Bangladesh Time', searchTerms: ['Asia/Dhaka', 'Asia/Thimphu'] },
    { value: 'Asia/Rangoon', text: 'Myanmar Time', searchTerms: ['Asia/Rangoon', 'Indian/Cocos'] },
    {
        value: 'Antarctica/Davis',
        text: 'Davis Time',
        searchTerms: [
            'Antarctica/Davis',
            'Asia/Bangkok',
            'Asia/Hovd',
            'Asia/Jakarta',
            'Asia/Phnom_Penh',
            'Asia/Pontianak',
            'Asia/Saigon',
            'Asia/Vientiane',
            'Etc/GMT-7',
            'Indian/Christmas',
        ],
    },
    {
        value: 'Asia/Novokuznetsk',
        text: 'Krasnoyarsk Time',
        searchTerms: ['Asia/Novokuznetsk', 'Asia/Novosibirsk', 'Asia/Omsk', 'Asia/Krasnoyarsk'],
    },
    {
        value: 'Asia/Hong_Kong',
        text: 'Hong Kong Time',
        searchTerms: [
            'Asia/Hong_Kong',
            'Asia/Macau',
            'Asia/Shanghai',
            'Asia/Brunei',
            'Asia/Kuala_Lumpur',
            'Asia/Kuching',
            'Asia/Makassar',
            'Asia/Manila',
            'Asia/Singapore',
            'Etc/GMT-8',
            'Antarctica/Casey',
            'Australia/Perth',
            'Asia/Taipei',
            'Asia/Choibalsan',
            'Asia/Ulaanbaatar',
            'Asia/Irkutsk',
        ],
    },
    {
        value: 'Asia/Pyongyang',
        text: 'Korean Time',
        searchTerms: [
            'Asia/Pyongyang',
            'Asia/Seoul',
            'Asia/Dili',
            'Asia/Jayapura',
            'Asia/Tokyo',
            'Etc/GMT-9',
            'Pacific/Palau',
        ],
    },
    {
        value: 'Australia/Adelaide',
        text: 'Australian Central Time',
        searchTerms: ['Australia/Adelaide', 'Australia/Broken_Hill', 'Australia/Darwin'],
    },
    {
        value: 'Australia/Brisbane',
        text: 'Australian Eastern Time',
        searchTerms: [
            'Australia/Brisbane',
            'Australia/Lindeman',
            'Australia/Melbourne',
            'Australia/Sydney',
            'Australia/Currie',
            'Australia/Hobart',
            'Antarctica/Macquarie',
            'Etc/GMT-11',
            'Pacific/Efate',
            'Pacific/Guadalcanal',
            'Pacific/Kosrae',
            'Pacific/Noumea',
            'Pacific/Ponape',
            'Antarctica/DumontDUrville',
            'Etc/GMT-10',
            'Pacific/Guam',
            'Pacific/Port_Moresby',
            'Pacific/Saipan',
            'Pacific/Truk',
        ],
    },
    { value: 'Asia/Chita', text: 'Yakutsk Time', searchTerms: ['Asia/Chita', 'Asia/Khandyga', 'Asia/Yakutsk'] },
    {
        value: 'Asia/Sakhalin',
        text: 'Sakhalin Time',
        searchTerms: ['Asia/Sakhalin', 'Asia/Ust-Nera', 'Asia/Vladivostok'],
    },
    { value: 'Antarctica/McMurdo', text: 'New Zealand Time', searchTerms: ['Antarctica/McMurdo', 'Pacific/Auckland'] },
    {
        value: 'Pacific/Fiji',
        text: 'Fiji Time',
        searchTerms: [
            'Pacific/Fiji',
            'Asia/Anadyr',
            'Asia/Kamchatka',
            'Asia/Magadan',
            'Asia/Srednekolymsk',
            'Asia/Kamchatka',
        ],
    },
    { value: 'Pacific/Apia', text: 'Apia Time', searchTerms: ['Pacific/Apia'] },
]
