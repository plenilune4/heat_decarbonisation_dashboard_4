import { CheckIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { api, api_no_auth, ApiResponse } from '@/services/api.service'
import { cn } from '@/utils/cn'
import { InputLabelCase, RecursiveKeyOf } from '@/utils/scary-utils'

import Button, { ButtonStyleSuccess, ButtonStyleWarning } from '@/components/Button'
import ErrorBoundary from '@/components/ErrorBoundary'
import Loading, { LoadingProps } from '@/components/Loading'

import { ValidationRule } from './form-validation'

// Partials all the way down, so nested objects are not strongly typed inside the FormWrapper
export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> }

// Typed field names
export type FormKey<T> = RecursiveKeyOf<T>

export interface FormWrapperLogging {
    // logs formValue updates inside an effect
    formValues?: boolean
    // logs field values inside the useInputValue hook
    fields?: string[] | 'all'
    // logs submission status inside an effect
    submissionStatus?: boolean
    // logs validation rules as they are checked on the input, and on submission
    validationStatus?: boolean
    // logs formWrapper actions, hooks, methods
    wrapperFunctions?: boolean // Not implemented
    // turn on request logging for this form
    requests?: boolean
}

// Options inherited by Input fields
export interface FormWrapperInputOptions<FormValuesType = any> {
    validationRules?: ValidationRule<FormValuesType>[]
    validationMode?: 'on-input' | 'on-submit'
    showValidationErrors?: boolean
    autoLabelInputs?: boolean
    labelCase?: InputLabelCase
    // DEV TOOLS
    logging?: FormWrapperLogging
}

export type FormSubmissionStatus = 'pending' | 'success' | 'fail' | 'invalid' | null

type FormWrapperProps<FormValuesType> = {
    // Form Data
    //
    // api endpoint for GET and POST, see other props for including id in either request
    endpoint: string
    //
    // resource id.
    // id === 'new' then formValues will be set from defaultValues
    // id !== null then formValues will be set from endpoint/:id on initial load
    id: string | 'new' | null
    //
    // formValues will not be fetched on mount, defaultValues will be used if supplied
    preventInitialLoad?: boolean
    //
    // if preventInitialLoad is true or id === 'new', these values will be used to populate the form
    defaultValues?: DeepPartial<FormValuesType>
    //
    // if true, the requests will not be authenticated
    isPublic?: boolean

    // Validation
    //
    // controls when validationRules are checked, on-submit by default. on-input to check as values are set
    validationMode?: 'on-input' | 'on-submit'
    //
    // array or rules to check according to above mode. See interface for implementation. Prompts are displayed below input field
    validationRules?: ValidationRule<FormValuesType>[]

    // Submission Logic
    //
    // id will be appended to endpoint on submission
    includeIdInPost?: boolean
    //
    // can insert arbitrary data into the post body, much better than setting a default value not used in the form
    insertIntoPostBody?: { [key: string]: any }
    //
    // if true will go back after successful submission or string to custom redirect
    redirectAfterSubmit?: boolean | string
    //
    // runs after successful submission, response body is available if POST request is expected to return
    callbackAfterSubmit?: ({
        postResponse,
        formValues,
        setFormValues,
        formOptions,
    }?: {
        postResponse?: ApiResponse<any>
        formValues?: DeepPartial<FormValuesType>
        setFormValues?: React.Dispatch<React.SetStateAction<DeepPartial<FormValuesType>>>
        formOptions?: FormWrapperInputOptions
    }) => void
    //
    // pass in some error messages for particular error codes
    // hierarchy of message displayed is:
    //  - messages defined with this prop
    //  - response.body.error
    //  - response.statusText
    //  - default 'Something went wrong...'
    errorMessages?: {
        [httpStatusCode: number]: string
    }
    //
    // ESCAPE HATCH
    // replace submission logic (write the POST request), FormWrapper will still handle validation and submissionStatus
    // onSubmit?: (formValues?: DeepPartial<FormValuesType>, event?: React.FormEvent<HTMLFormElement>) => Promise<any>
    onSubmit?: (formValues?: DeepPartial<FormValuesType>, event?: React.SyntheticEvent<Element, Event>) => Promise<any>
    //
    // NUCLEAR OPTION
    // AVOID USING - replace the submission button including submission status indicator and error messages
    //      TO DO SOMETHING ON SUBMISSION
    //      PREFER - above submission logic options
    //
    //      TO CHANGE SOMETHING ABOUT THE BUTTON
    //      PREFER - below appearance options
    hideSubmitButton?: boolean

    // Appearance
    //
    // useful default styling, clean card with shadow. 'standalone' will take care of its positioning on the page, useful for form pages
    displayAs?: 'inline-card' | 'standalone-card'
    //
    // applied to form element, merges over displayAs values
    className?: string
    //
    // overwrite the text on the submit button, optionally pass a function to define text based on status
    submitButtonText?: string | ((status: FormSubmissionStatus) => string)
    //
    // place button in any corner, center will make button full width. Status and error message will follow the button around nicely
    submitButtonAlignment?: 'left' | 'center' | 'right' | 'top-left' | 'top-center' | 'top-right'
    //
    // add class directly to Button, note that button changes colour based on status, so can also pass a function based on status
    submitButtonClass?: string | ((status: FormSubmissionStatus) => string)
    //
    //
    additionalSubmissionRowContent?: React.ReactNode
    //
    // by default, labels will be created from field names from camelCase to Title Case. Individual inputs can still be overwritten
    autoLabelInputs?: boolean
    //
    //
    labelCase?: InputLabelCase
    //
    // show a spinner while initial data fetching is pending. If fetching is expected to be fast displaying the spinner can make the process feel slower for the user
    showLoadingSpinner?: boolean

    // DEV OPTIONS
    logging?: FormWrapperLogging
} & (
    | {
          multipart?: false
          //
          // Destructure FormWrapper children into the form body
          children: (
              formControl: (field: FormKey<FormValuesType>) => {
                  field: FormKey<FormValuesType>
                  formValues: DeepPartial<FormValuesType>
                  setFormValues: React.Dispatch<React.SetStateAction<DeepPartial<FormValuesType>>>
                  formOptions?: FormWrapperInputOptions<FormValuesType>
              },
              form: {
                  formValues: DeepPartial<FormValuesType>
                  setFormValues: React.Dispatch<React.SetStateAction<DeepPartial<FormValuesType>>>
                  formOptions?: FormWrapperInputOptions<FormValuesType>
                  submit: (values?: DeepPartial<FormValuesType>) => Promise<void>
                  submissionStatus: FormSubmissionStatus
                  error: string | null
                  checkValidation: (formValues: DeepPartial<FormValuesType>) => {
                      isValid: boolean
                      errors: ValidationRule[]
                  }
              }
          ) => React.ReactNode
      }
    | {
          multipart: true
          //
          // Destructure FormWrapper children into the form body
          children: (
              formControl: (field: FormKey<FormValuesType>) => {
                  field: FormKey<FormValuesType>
                  formValues: DeepPartial<FormValuesType>
                  setFormValues: React.Dispatch<React.SetStateAction<DeepPartial<FormValuesType>>>
                  formOptions?: FormWrapperInputOptions<FormValuesType>
              },
              form: {
                  formValues: DeepPartial<FormValuesType>
                  setFormValues: React.Dispatch<React.SetStateAction<DeepPartial<FormValuesType>>>
                  formOptions?: FormWrapperInputOptions<FormValuesType>
                  submit: (values?: DeepPartial<FormValuesType>) => Promise<void>
                  submissionStatus: FormSubmissionStatus
                  error: string | null
                  checkValidation: (formValues: DeepPartial<FormValuesType>) => {
                      isValid: boolean
                      errors: ValidationRule[]
                  }
              }
          ) => React.ReactNode[]
      }
)

// Optionally type the FormWrapper for intellisense on the form.formValues object
export default function FormWrapper<FormValuesType>({
    // Form Data
    endpoint,
    id,
    preventInitialLoad = false,
    defaultValues,
    isPublic = false,

    // Validation
    validationMode = 'on-submit',
    validationRules,

    // Submission Logic
    includeIdInPost = false,
    insertIntoPostBody,
    redirectAfterSubmit,
    callbackAfterSubmit,
    errorMessages,
    onSubmit,
    hideSubmitButton = false,

    // Style
    className,
    submitButtonText,
    submitButtonAlignment,
    submitButtonClass,
    additionalSubmissionRowContent,
    displayAs,
    autoLabelInputs = true,
    labelCase,
    showLoadingSpinner = false,

    //
    children,

    // DevOptions
    logging,

    // Experimental
    multipart,
}: FormWrapperProps<FormValuesType>) {
    const navigate = useNavigate()

    const [formValues, setFormValues] = useState<DeepPartial<FormValuesType>>({})
    const [formOptions, setFormOptions] = useState<FormWrapperInputOptions<FormValuesType>>({})
    const [submissionStatus, setSubmissionStatus] = useState<FormSubmissionStatus>(null)
    const [error, setError] = useState<string | null>(null)

    const [formPart, setFormPart] = useState<number>(0)

    const api_function = useMemo(() => {
        if (isPublic) {
            return api_no_auth
        } else {
            return api
        }
    }, [isPublic])

    /* DEV TOOLS & LOGGING
     */
    useEffect(() => {
        setFormOptions((p) => ({
            ...p,
            validationMode,
            validationRules,
            autoLabelInputs,
            logging,
            labelCase: labelCase ?? import.meta.env.VITE_INPUT_LABEL_CASE ?? 'title',
        }))
    }, [validationRules, validationMode, autoLabelInputs, logging, labelCase])

    useEffect(() => {
        if (formOptions.logging?.formValues) {
            console.log('[ Form ] VALUES:', formValues)
        }
    }, [formOptions?.logging, formValues])

    useEffect(() => {
        if (formOptions.logging?.submissionStatus) {
            console.log('[ Form ] SUBMISSION STATUS:', submissionStatus, submissionStatus === 'fail' ? error : '')
        }
    }, [formOptions?.logging, submissionStatus])

    /* DATA FETCHING & SUBMISSION
     */
    // Initial fetching and setting formValues
    useLayoutEffect(() => {
        if (formOptions?.logging?.wrapperFunctions) {
            console.log('[ Form ] EFFECT: fetch data or set default values on initial load', {
                id,
                endpoint,
                preventInitialLoad,
            })
        }

        if (id === 'new' || preventInitialLoad) {
            setFormValues(defaultValues ?? {})
        } else {
            // id == string || null
            const _endpoint = id === null ? (endpoint ?? '') : `${endpoint}/${id}`
            api_function<FormValuesType>(_endpoint, null, formOptions?.logging?.requests).then((res) =>
                setFormValues({ ...(res.data ?? {}) })
            )
        }
    }, [id, endpoint, preventInitialLoad])

    // Handles validation and submission state, allows for custom onSubmit
    // async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    async function handleSubmit(values?: DeepPartial<FormValuesType>) {
        if (formOptions?.logging?.wrapperFunctions) {
            console.log('[ Form ] handleSubmit()', { values })
        }

        let { isValid } = checkValidation(values ?? formValues)
        if (!isValid) {
            setSubmissionStatus('invalid')
            setError('Please check for errors')
            if (validationMode === 'on-submit') {
                setFormOptions((p) => ({ ...p, showValidationErrors: true }))
            }
            return
        }

        setSubmissionStatus('pending')
        if (onSubmit) {
            await onSubmit(values ?? formValues)
                .then((res) => {
                    setSubmissionStatus('success')
                    if (callbackAfterSubmit) {
                        callbackAfterSubmit({
                            postResponse: res,
                            formValues,
                            setFormValues,
                            formOptions,
                        })
                    }
                })
                .catch((err) => {
                    setSubmissionStatus('fail')
                    if (typeof err === 'string') {
                        setError(err)
                    } else if (typeof err === 'object') {
                        const { status, error } = err
                        if (status && errorMessages && errorMessages[status]) {
                            setError(errorMessages[status])
                        } else if (error) {
                            setError(error)
                        } else {
                            setError('Something went wrong...')
                        }
                    }
                })
        } else {
            let _endpoint = includeIdInPost && id ? `${endpoint}/${id}` : (endpoint ?? '')
            try {
                const res = await api_function<FormValuesType>(
                    _endpoint,
                    { ...formValues, ...insertIntoPostBody },
                    formOptions?.logging?.requests
                )
                if (res?.error) {
                    throw {
                        status: res.status,
                        error: res.error,
                    }
                }
                setSubmissionStatus('success')
                if (callbackAfterSubmit) {
                    callbackAfterSubmit({
                        postResponse: res,
                        formValues,
                        setFormValues,
                        formOptions,
                    })
                }
            } catch (err) {
                setSubmissionStatus('fail')
                if (typeof err === 'string') {
                    setError(err)
                } else if (typeof err === 'object') {
                    const { status, error } = err
                    if (status && errorMessages && errorMessages[status]) {
                        setError(errorMessages[status])
                    } else if (error) {
                        setError(error)
                    } else {
                        setError('Something went wrong...')
                    }
                }
            }
        }
    }

    // Redirect after successful submission
    useEffect(() => {
        if (submissionStatus === 'success') {
            if (redirectAfterSubmit) {
                if (formOptions?.logging?.wrapperFunctions) {
                    console.log('[ Form ] EFFECT: redirect on successful submit', {
                        submissionStatus,
                        redirectAfterSubmit,
                    })
                }
                if (typeof redirectAfterSubmit === 'string') {
                    navigate(redirectAfterSubmit)
                } else {
                    navigate(-1)
                }
            }
        }
    }, [submissionStatus, redirectAfterSubmit])

    /* VALIDATION
     */
    // Check through validation rules
    function checkValidation(values: DeepPartial<FormValuesType>): {
        isValid: boolean
        errors: ValidationRule[]
    } {
        if (formOptions?.logging?.wrapperFunctions) {
            console.log('[ Form ] checkValidation()', { values })
        }

        if (!validationRules) {
            return { isValid: true, errors: [] }
        }

        let errors: ValidationRule[] = []
        for (const rule of validationRules) {
            if (rule.isValid(values[rule.field], formValues) === false) {
                errors.push(rule)
                // errors.push(`${fieldNameToLabelString(rule.field)}: ${rule?.prompt ?? 'Invalid'}`)
            }
        }

        if (formOptions?.logging?.validationStatus) {
            console.log(
                `[ Form ] checkValidation() -> ${!!errors?.length ? 'FAILED, failing rules:' : 'PASSED'}`,
                !!errors.length && errors
            )
        }

        if (errors.length) {
            return { isValid: false, errors }
        }

        return { isValid: true, errors: [] }
    }

    // Re-validate after submission fail
    useEffect(() => {
        if (submissionStatus === 'invalid') {
            if (formOptions?.logging?.wrapperFunctions) {
                console.log('[ Form ] EFFECT: revalidate on input after invalid submission', { formValues })
            }
            let { isValid } = checkValidation(formValues)
            if (isValid) {
                setSubmissionStatus(null)
                setFormOptions((p) => ({ ...p, showValidationErrors: false }))
            }
        }
    }, [formValues, checkValidation])

    /* EXPERIMENTAL
     */
    function formControl(field: FormKey<FormValuesType>): {
        field: FormKey<FormValuesType>
        formValues: DeepPartial<FormValuesType>
        setFormValues: React.Dispatch<React.SetStateAction<DeepPartial<FormValuesType>>>
        formOptions?: FormWrapperInputOptions<FormValuesType>
    } {
        return {
            field,
            formValues,
            setFormValues,
            formOptions,
        }
    }

    /*
        RENDER
    */
    if (showLoadingSpinner && (!formValues || Object.keys(formValues).length === 0)) {
        return <Loading size={64} className='animate-fade' />
    }

    return (
        <form
            onSubmit={async (e) => {
                e.preventDefault()
                if (
                    multipart &&
                    formPart + 1 <
                        children(formControl, {
                            formValues,
                            setFormValues,
                            formOptions,
                            submit: (values?: DeepPartial<FormValuesType>) => handleSubmit(values),
                            submissionStatus,
                            error,
                            checkValidation,
                        }).length
                ) {
                    e.preventDefault()
                    setFormPart((p) => p + 1)
                } else {
                    await handleSubmit()
                }
            }}
            className={cn(
                displayAs === 'standalone-card' && 'form-standalone',
                displayAs === 'inline-card' && 'form-inline',
                submitButtonAlignment?.startsWith('top') && 'flex flex-col-reverse',
                className
            )}
        >
            <ErrorBoundary componentName='FormWrapper children'>
                {multipart ? (
                    <>
                        {children(formControl, {
                            formValues,
                            setFormValues,
                            formOptions,
                            submit: (values?: DeepPartial<FormValuesType>) => handleSubmit(values),
                            submissionStatus,
                            error,
                            checkValidation,
                        }).map((part, index, arr) => {
                            if (index !== formPart) {
                                return <Fragment key={index} />
                            }
                            return (
                                <Fragment key={index}>
                                    {part}
                                    {index + 1 === arr.length ? (
                                        <SubmissionRow
                                            submitButtonAlignment={submitButtonAlignment ?? 'right'}
                                            submitButtonText={submitButtonText}
                                            submitButtonClass={submitButtonClass}
                                            submissionStatus={submissionStatus}
                                            additionalSubmissionRowContent={
                                                index > 0 && (
                                                    <Button onClick={() => setFormPart((p) => p - 1)}>
                                                        {/* <ArrowLeftIcon className='w-5 h-5' /> */}
                                                        Back
                                                    </Button>
                                                )
                                            }
                                            error={error}
                                        />
                                    ) : (
                                        <SubmissionRow
                                            submitButtonAlignment={submitButtonAlignment ?? 'right'}
                                            submitButtonText={'Next'}
                                            submitButtonClass={submitButtonClass}
                                            submissionStatus={submissionStatus}
                                            additionalSubmissionRowContent={
                                                index > 0 && (
                                                    <Button.Outline onClick={() => setFormPart((p) => p - 1)}>
                                                        {/* <ArrowLeftIcon className='w-5 h-5' /> */}
                                                        Back
                                                    </Button.Outline>
                                                )
                                            }
                                            error={error}
                                        />
                                    )}
                                </Fragment>
                            )
                        })}
                    </>
                ) : (
                    <>
                        {children(formControl, {
                            formValues,
                            setFormValues,
                            formOptions,
                            submit: (values?: DeepPartial<FormValuesType>) => handleSubmit(values),
                            submissionStatus,
                            error,
                            checkValidation,
                        })}
                        {!hideSubmitButton && (
                            <SubmissionRow
                                submitButtonAlignment={submitButtonAlignment ?? 'right'}
                                submitButtonText={submitButtonText}
                                submitButtonClass={submitButtonClass}
                                submissionStatus={submissionStatus}
                                additionalSubmissionRowContent={additionalSubmissionRowContent}
                                error={error}
                            />
                        )}
                    </>
                )}
            </ErrorBoundary>
        </form>
    )
}

/*
    Submit button with submission status and error communication
*/
export function SubmissionRow({
    submitButtonAlignment,
    submitButtonText,
    submitButtonClass,
    submissionStatus,
    error,
    additionalSubmissionRowContent,
}: {
    submitButtonAlignment: 'left' | 'center' | 'right' | 'top-left' | 'top-center' | 'top-right'
    submitButtonText?: string | ((status: FormSubmissionStatus) => string)
    submitButtonClass?: string | ((status: FormSubmissionStatus) => string)
    submissionStatus: FormSubmissionStatus
    error: string | null
    additionalSubmissionRowContent?: React.ReactNode
}) {
    let setToTop: boolean = submitButtonAlignment.startsWith('top')
    if (setToTop) {
        submitButtonAlignment = submitButtonAlignment.slice(4) as 'left' | 'center' | 'right'
    }

    function _submitButtonText(): string {
        if (!submitButtonText) {
            return submissionStatus === 'fail' ? 'Retry' : 'Submit'
        }

        if (submitButtonText instanceof Function) {
            return submitButtonText(submissionStatus)
        }

        return submissionStatus === 'fail' ? 'Retry' : submitButtonText
    }

    return (
        <div
            className={cn(
                'flex items-center gap-2',
                submitButtonAlignment === 'left' &&
                    (additionalSubmissionRowContent ? 'flex-wrap' : 'flex-row-reverse flex-wrap justify-end'),
                //
                submitButtonAlignment === 'right' &&
                    (additionalSubmissionRowContent ? 'flex-wrap justify-end' : 'flex-row flex-wrap justify-end'),
                //
                submitButtonAlignment === 'center' &&
                    (additionalSubmissionRowContent ? 'flex-col' : 'flex-col items-stretch text-center'),
                //
                setToTop ? 'mb-4 flex-wrap-reverse' : 'mt-4',
                setToTop &&
                    submitButtonAlignment === 'center' &&
                    (additionalSubmissionRowContent ? 'flex-col-reverse' : 'flex-col-reverse')
            )}
            style={{
                // error messages appearing tricks the layout to pop in and out scroll bars
                overflow: 'clip',
                // keep the ring outside the button visible
                overflowClipMargin: '3px',
            }}
        >
            {(submissionStatus === 'fail' || submissionStatus === 'invalid') && (
                <p className='text-base text-amber-500 animate-fade-left'>{error ?? 'Something went wrong'}</p>
            )}
            <div
                className={cn(
                    'flex items-center gap-2',
                    submitButtonAlignment === 'right' &&
                        (additionalSubmissionRowContent ? 'w-full justify-between' : 'flex-row'),
                    //
                    submitButtonAlignment === 'left' &&
                        (additionalSubmissionRowContent
                            ? 'w-full justify-between flex-row-reverse'
                            : 'flex-row-reverse'),
                    //
                    submitButtonAlignment === 'center' &&
                        (additionalSubmissionRowContent ? 'flex-col-reverse w-full' : 'flex-col-reverse')
                )}
            >
                {additionalSubmissionRowContent && additionalSubmissionRowContent}
                {submitButtonAlignment === 'center' ? (
                    <Button
                        type='submit'
                        className={cn(
                            'z-10 w-full',
                            submissionStatus === 'fail' ? ButtonStyleWarning : ButtonStyleSuccess,
                            typeof submitButtonClass === 'string' && submitButtonClass,
                            submitButtonClass instanceof Function && submitButtonClass(submissionStatus)
                        )}
                    >
                        {submissionStatus === 'pending' && (
                            <div className='animate-fade'>
                                <Loading size={24} />
                            </div>
                        )}
                        {submissionStatus === 'success' && (
                            <CheckIcon className='w-6 h-6 stroke-2 text-white-500 animate-fade' />
                        )}
                        {(submissionStatus === 'fail' || submissionStatus === 'invalid') && (
                            <ExclamationCircleIcon className='w-6 h-6 text-white-500 animate-fade' />
                        )}
                        {submissionStatus === null && _submitButtonText()}
                    </Button>
                ) : (
                    <div
                        className={cn(
                            'flex items-center gap-x-2',
                            submitButtonAlignment === 'right' && 'flex-row',
                            submitButtonAlignment === 'left' && 'flex-row-reverse'
                        )}
                    >
                        {submissionStatus === 'success' && (
                            <CheckIcon
                                className={cn(
                                    'w-7 h-7 stroke-2 text-emerald-500 animate-twice animate-duration-[1400ms] animate-ease-in-out animate-alternate',
                                    submitButtonAlignment === 'right' ? 'animate-fade-left' : 'animate-fade-right'
                                )}
                            />
                        )}
                        {(submissionStatus === 'fail' || submissionStatus === 'invalid') && (
                            <ExclamationCircleIcon
                                className={cn(
                                    'w-6 h-6 text-amber-500',
                                    submitButtonAlignment === 'right' ? 'animate-fade-left' : 'animate-fade-right'
                                )}
                            />
                        )}
                        <Button
                            type='submit'
                            className={cn(
                                'z-10 min-w-[10ch]',
                                submissionStatus === 'fail' ? ButtonStyleWarning : ButtonStyleSuccess,
                                typeof submitButtonClass === 'string' && submitButtonClass,
                                submitButtonClass instanceof Function && submitButtonClass(submissionStatus)
                            )}
                        >
                            {submissionStatus === 'pending' ? (
                                <div className='animate-fade'>
                                    <Loading size={24} />
                                </div>
                            ) : (
                                _submitButtonText()
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

/*
    Debounced submission component

    Add to a form with the required props and this will handle the submission and loading state
*/
export function DebouncedSubmission<FormValuesType>({
    formValues,
    submit,
    loadingProps = undefined,
    debounceTime = 500,
    children = undefined,
}: {
    formValues: DeepPartial<FormValuesType>
    submit: () => Promise<void>
    loadingProps?: LoadingProps
    debounceTime?: number
    children?: ({ isSubmitting }: { isSubmitting: boolean }) => React.ReactNode
}) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const debouncedSubmit = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
            submit().finally(() => {
                timeoutRef.current = null
                setIsSubmitting(false)
            })
        }, debounceTime)
    }

    useEffect(() => {
        if (formValues && Object.keys(formValues).length > 0) {
            setIsSubmitting(true)
            debouncedSubmit()
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [formValues])

    if (children) {
        return children({ isSubmitting })
    }

    return <Loading isLoading={isSubmitting} text='Saving...' textPosition='left' {...loadingProps} />
}

/*
    Display validation status of a form

    If the form is valid, the validComponent will be displayed
    If the form is invalid, the invalidComponent will be displayed
    If the form is invalid and no invalidComponent is provided, the defaultMessage will be displayed
*/
export function FormValidationStatus<FormValuesType>({
    formValues,
    formOptions,
    checkValidation,
    className,
    defaultMessage = 'Please check your submission and try again',
    children = undefined,
}: {
    formValues: DeepPartial<FormValuesType>
    formOptions?: FormWrapperInputOptions<FormValuesType>
    checkValidation: (formValues: DeepPartial<FormValuesType>) => {
        isValid: boolean
        errors: ValidationRule[]
    }
    className?: string
    defaultMessage?: string
    children?: ({
        isValid,
        failingRules,
        showingErrors,
    }: {
        isValid: boolean
        failingRules: ValidationRule[]
        showingErrors: boolean
    }) => React.ReactNode
}) {
    const { isValid, errors } = checkValidation(formValues)
    const showingErrors = useMemo(
        () => formOptions?.validationMode === 'on-input' || formOptions?.showValidationErrors,
        [formOptions]
    )

    if (children) {
        return children({ isValid, failingRules: errors, showingErrors })
    }

    if (isValid) {
        return null
    }

    if (showingErrors) {
        return (
            <div className={cn('flex gap-2 items-center', className)}>
                <ExclamationCircleIcon className='w-6 h-6 text-amber-500' />
                <p className='text-base text-amber-500'>{errors[0]?.prompt ?? defaultMessage}</p>
            </div>
        )
    }

    return null
}
