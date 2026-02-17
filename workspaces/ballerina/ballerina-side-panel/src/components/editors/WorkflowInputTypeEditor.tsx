/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";
import { FormField } from "../Form/types";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Type, Member, NodeProperties } from "@wso2/ballerina-core";
import type { WorkflowInputType } from "@wso2/ballerina-core";
import { ThemeColors, CheckBox, SearchBox, ProgressRing } from "@wso2/ui-toolkit";
import { TypeEditor as TypeEditorField } from "./TypeEditor";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 4px;
    background: ${ThemeColors.SURFACE};
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SectionTitle = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
`;

const SectionDescription = styled.div`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin-bottom: 8px;
`;

const FieldsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;
    padding: 8px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 4px;
`;

const FieldItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    
    &:hover {
        background: ${ThemeColors.SURFACE_CONTAINER};
    }
`;

const FieldInfo = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
`;

const FieldName = styled.span`
    font-size: 13px;
    color: ${ThemeColors.ON_SURFACE};
    font-weight: 500;
`;

const FieldType = styled.span`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
`;

const EmptyState = styled.div`
    padding: 24px;
    text-align: center;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    font-size: 13px;
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24px;
`;

interface WorkflowInputTypeEditorProps {
    field: FormField;
    openRecordEditor?: (open: boolean, newType?: string | NodeProperties) => void;
    openFormTypeEditor?: (open: boolean, newType?: string) => void;
    handleOnFieldFocus?: (key: string) => void;
    handleOnTypeChange?: (value?: string) => void;
    handleNewTypeSelected?: (type: string | any) => void;
    isContextTypeEditorSupported?: boolean;
    autoFocus?: boolean;
    onBlur?: () => void | Promise<void>;
}

interface FieldSelection {
    fieldName: string;
    fieldType: string;
}

export function WorkflowInputTypeEditor(props: WorkflowInputTypeEditorProps) {
    const { 
        field, 
        handleOnFieldFocus, 
        autoFocus, 
        onBlur, 
        openRecordEditor,
        openFormTypeEditor,
        handleOnTypeChange,
        handleNewTypeSelected,
        isContextTypeEditorSupported
    } = props;
    const { rpcClient } = useRpcContext();
    
    const fieldValue = Array.isArray(field.value) ? field.value[0] : field.value;
    const [selectedType, setSelectedType] = useState<string>("");
    const [typeDetails, setTypeDetails] = useState<Type | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedFields, setSelectedFields] = useState<FieldSelection[]>([]);
    const [searchText, setSearchText] = useState("");

    // Watch field value changes to update selectedType
    useEffect(() => {
        const value = Array.isArray(field.value) ? field.value[0] : field.value;
        if (value && typeof value === 'string') {
            // Value is just the type name
            if (value !== selectedType) {
                setSelectedType(value);
            }
        }
    }, [field.value]);

    // Fetch type details when type is selected
    useEffect(() => {
        if (selectedType && selectedType.trim() !== "") {
            fetchTypeDetails(selectedType);
        } else {
            setTypeDetails(null);
            setSelectedFields([]);
        }
    }, [selectedType]);

    const fetchTypeDetails = async (typeName: string) => {
        setLoading(true);
        try {
            // Get all types from the current file (we'll need to pass the actual file path)
            // For now, using a placeholder - this should be the actual file path from context
            const response = await rpcClient.getBIDiagramRpcClient().getTypes({
                filePath: "types.bal", // This should come from the form context
            });
            
            if (response && response.types && response.types.length > 0) {
                // Find the exact match
                const matchedType = response.types.find((t: Type) => t.name === typeName);
                if (matchedType) {
                    setTypeDetails(matchedType);
                    
                    // Check if there are already selected fields in the typeModels
                    const workflowInputType = field.types?.find(
                        t => t.fieldType === "WORKFLOW_INPUT_TYPE" as any
                    ) as any as WorkflowInputType | undefined;
                    
                    if (workflowInputType?.typeModels && workflowInputType.typeModels.length > 0) {
                        // Restore selected fields from typeModels (fields marked as readonly)
                        const existingTypeModel = workflowInputType.typeModels[0];
                        const restoredFields: FieldSelection[] = [];
                        existingTypeModel.members?.forEach((member: Member) => {
                            if (member.readonly) {
                                const memberType = typeof member.type === 'string' ? member.type : member.type?.name || "any";
                                restoredFields.push({
                                    fieldName: member.name,
                                    fieldType: memberType
                                });
                            }
                        });
                        setSelectedFields(restoredFields);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching type details:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateTypeModels = (selectedFieldsList: FieldSelection[]) => {
        if (!typeDetails) return;

        // Create a deep copy of the type with updated readonly fields
        const updatedType: Type = {
            ...typeDetails,
            members: typeDetails.members?.map((member: Member) => {
                const isSelectedField = selectedFieldsList.some(sf => sf.fieldName === member.name);
                return {
                    ...member,
                    readonly: isSelectedField
                };
            }) || []
        };

        // Update the field's types array to include the typeModels
        if (field.types && field.types.length > 0) {
            const workflowInputTypeIndex = field.types.findIndex(
                t => t.fieldType === "WORKFLOW_INPUT_TYPE" as any
            );

            if (workflowInputTypeIndex !== -1) {
                // Create a new types array with the updated WorkflowInputType
                const updatedTypes = field.types.map((type, index) => {
                    if (index === workflowInputTypeIndex) {
                        const workflowInputType = type as any as WorkflowInputType;
                        return {
                            ...workflowInputType,
                            typeModels: [updatedType]
                        } as any;
                    }
                    return type;
                });
                
                // Replace the field's types array with the new one
                // This ensures React detects the change
                field.types.splice(0, field.types.length, ...updatedTypes);
            }
        }
    };

    const handleFieldToggle = (member: Member) => {
        const fieldName = member.name;
        const memberType = typeof member.type === 'string' ? member.type : member.type?.name || "any";
        const fieldType = memberType;
        
        const isSelected = selectedFields.some(f => f.fieldName === fieldName);
        
        let newSelectedFields: FieldSelection[];
        if (isSelected) {
            newSelectedFields = selectedFields.filter(f => f.fieldName !== fieldName);
        } else {
            newSelectedFields = [...selectedFields, { fieldName, fieldType }];
        }
        
        setSelectedFields(newSelectedFields);
        
        // Update field value to just the type name
        field.onValueChange?.(selectedType);
        
        // Update the typeModels in the field's types array with readonly flags
        updateTypeModels(newSelectedFields);
    };

    const filteredMembers = typeDetails?.members?.filter((member: Member) => {
        if (!searchText) return true;
        const memberType = typeof member.type === 'string' ? member.type : member.type?.name || "";
        return member.name.toLowerCase().includes(searchText.toLowerCase()) ||
               memberType.toLowerCase().includes(searchText.toLowerCase());
    }) || [];

    return (
        <Container>
            <Section>
                <SectionTitle>Select Input Type</SectionTitle>
                <SectionDescription>
                    Choose the type of data that will be input to the workflow
                </SectionDescription>
                <TypeEditorField
                    field={field}
                    openRecordEditor={openRecordEditor}
                    openFormTypeEditor={openFormTypeEditor}
                    handleOnFieldFocus={handleOnFieldFocus}
                    handleOnTypeChange={handleOnTypeChange}
                    handleNewTypeSelected={handleNewTypeSelected}
                    isContextTypeEditorSupported={isContextTypeEditorSupported}
                    autoFocus={autoFocus}
                    onBlur={onBlur}
                />
            </Section>

            {selectedType && selectedType.trim() !== "" && (
                <Section>
                    <SectionTitle>Select Correlation ID Fields</SectionTitle>
                    <SectionDescription>
                        Choose one or more fields from the selected type to use as correlation identifiers.
                        These fields will help identify and track workflow instances.
                    </SectionDescription>
                    
                    {loading ? (
                        <LoadingContainer>
                            <ProgressRing />
                        </LoadingContainer>
                    ) : typeDetails && typeDetails.members && typeDetails.members.length > 0 ? (
                        <>
                            {typeDetails.members.length > 5 && (
                                <SearchBox
                                    placeholder="Search fields..."
                                    value={searchText}
                                    onChange={(value: string) => setSearchText(value)}
                                />
                            )}
                            <FieldsList>
                                {filteredMembers.length > 0 ? (
                                    filteredMembers.map((member: Member, index: number) => {
                                        const isSelected = selectedFields.some(
                                            f => f.fieldName === member.name
                                        );
                                        const memberType = typeof member.type === 'string' ? member.type : member.type?.name || "any";
                                        return (
                                            <FieldItem
                                                key={`${member.name}-${index}`}
                                                onClick={() => handleFieldToggle(member)}
                                            >
                                                <CheckBox
                                                    label=""
                                                    checked={isSelected}
                                                    onChange={() => handleFieldToggle(member)}
                                                />
                                                <FieldInfo>
                                                    <FieldName>{member.name}</FieldName>
                                                    <FieldType>{memberType}</FieldType>
                                                </FieldInfo>
                                            </FieldItem>
                                        );
                                    })
                                ) : (
                                    <EmptyState>No fields match your search</EmptyState>
                                )}
                            </FieldsList>
                        </>
                    ) : typeDetails ? (
                        <EmptyState>This type has no fields</EmptyState>
                    ) : (
                        <EmptyState>Type not found or could not load type details</EmptyState>
                    )}
                </Section>
            )}
        </Container>
    );
}
