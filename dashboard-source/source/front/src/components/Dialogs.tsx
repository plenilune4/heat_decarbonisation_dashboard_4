import Modal from "@/components/Modal.tsx";
import {Text} from "recharts";
import {TextField} from "@/form-control/fields";
import Button from "@/components/Button.tsx";
import React, {useState} from "react";
import {IBuildingSelection} from "@/MODELS/buildingSelection.model";
import {ICaseStudy} from "@/MODELS/caseStudy.model";
import { useAuth } from "@/services/authentication.service";


export function ChangedBSdialog({
                                    onClose,
                                    handleBSsaveAs,
                                    handleBSsave,
                                    buildingSelectionState,
                                    uneditedBSS,
                                    handleCSsave,
                                    caseStudy,
                                }: {
                                    onClose: () => void,
                                    handleBSsaveAs: (bss: IBuildingSelection, label: string) => string | void,
                                    handleBSsave: (bss: IBuildingSelection) => void,
                                    buildingSelectionState: IBuildingSelection,
                                    uneditedBSS?: IBuildingSelection
                                    handleCSsave: (cs: ICaseStudy, bs: IBuildingSelection) => void,
                                    caseStudy: ICaseStudy
                                }
) {
    // const {user} = useAuth()

    const choices = true ? ["Save as new building selection", "Discard building selection changes", "Overwrite current building selection"]
        : ["Save as new building selection", "Discard building selection changes"]
    const [choice, setChoice] = useState(0)

    const [newBSname, setNewBSname] = useState<string>("")

    const originalName = uneditedBSS?.name


    const handleChange = (event) => {
        console.log(event.target.value)
        console.log(choice)
        setChoice(event.target.value);
    };

    return (
        <div className='flex flex-col gap-4'>
            <h3 className='text-lg font-semibold'>Before saving case study...</h3>
            <Text>{`The ${originalName? originalName + " " : ""} selection of buildings used with this case study has been manually changed.
                How do you want to proceed?`}</Text>

            {choices.entries().map(([idx, ch]) =>
                (<div className='pb-1 pl-3'>
                    <label>
                        <input
                            type={"radio"}
                            name={ch}
                            value={idx}
                            checked={choice == idx}
                            onChange={handleChange}
                            style={{marginRight: '12px'}}
                        />
                        {ch}
                    </label>
                </div>)
            )}


            {
                // Saving a new building selection and assigning it to the case study:
                choice == 0 && (
                    <div>
                        <TextField
                            value={newBSname}
                            onChange={(text) => setNewBSname(text)}
                            placeholder='Name for the adjusted building selection.'
                            autoFocus
                            label=''
                        />

                        < div className='flex flex-row gap-2'>

                            <Button.Success
                                onClickAsync={async () => {
                                    const new_id = await handleBSsaveAs(buildingSelectionState, newBSname)
                                    onClose()
                                    handleCSsave(caseStudy, new_id)
                                }}
                                disabled={!newBSname.trim()} // Could also check it is different to existing label.
                            >
                                Proceed to save building selection and case study
                            </Button.Success>
                            <Button onClick={onClose}>Cancel</Button>
                        </div>
                    </div>
                )}

            {
                // Discard the changes to the original unedited building selection.
                choice == 1 && (
                    < div className='flex flex-row gap-2'>
                        <Button.Success
                            onClickAsync={async () => handleCSsave(caseStudy, uneditedBSS)}
                        >
                            Discard changes to building selection and save case study
                        </Button.Success>
                        <Button onClick={onClose}>Cancel</Button>
                    </div>
                )
            }

            {
                // Overwrite the changes to the building selection.
                choice ==2 && (
                    < div className='flex flex-row gap-2'>
                        <Button.Success
                            onClickAsync={async () => {
                                await handleBSsave(buildingSelectionState)
                                onClose()
                                handleCSsave(caseStudy, buildingSelectionState)
                            }}
                        >
                            Update {originalName ? `${originalName} ` : ""} building selection and save case study
                        </Button.Success>
                        <Button onClick={onClose}>Cancel</Button>
                    </div>
                )}


        </div>
    )

}