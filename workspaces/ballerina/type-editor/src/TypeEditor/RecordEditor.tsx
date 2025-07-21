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

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Member, Type } from '@wso2/ballerina-core';
import { Codicon } from '@wso2/ui-toolkit';
import { Button } from '@wso2/ui-toolkit';
import { FieldEditor } from './FieldEditor';
import styled from '@emotion/styled';


const Header = styled.div`
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 8px 0px;
    `;

const SectionTitle = styled.div`
        font-size: 13px;
        font-weight: 500;
        color: var(--vscode-editor-foreground);
        margin-bottom: 4px;
    `;

const ExtendedTypeSection = styled.div`
        margin-bottom: 16px;
        border: 1px solid var(--vscode-welcomePage-tileBorder);
        border-radius: 4px;
        overflow: hidden;
    `;

const ExtendedTypeHeader = styled.div`
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background-color: var(--vscode-editor-inactiveSelectionBackground);
        cursor: pointer;
        border-bottom: 1px solid var(--vscode-welcomePage-tileBorder);
    `;

const ExtendedTypeContent = styled.div`
        padding: 8px;
        background-color: var(--vscode-editor-background);
    `;

const ReadOnlyIndicator = styled.span`
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        font-style: italic;
        margin-left: auto;
    `;

interface RecordEditorProps {
    type: Type;
    isAnonymous: boolean;
    onChange: (type: Type) => void;
    isGraphql?: boolean;
    onValidationError: (isError: boolean) => void;
    extendedTypeFields?: { [typeName: string]: Member[] };
    onRemoveExtendedType?: (typeName: string) => void;
    readOnly?: boolean;
}

interface FieldValidationError {
    identifier: boolean;
    type: boolean;
}

export const RecordEditor = forwardRef<{ addMember: () => void }, RecordEditorProps>((props, ref) => {
    const { type, isAnonymous = false, onChange, isGraphql, onValidationError, extendedTypeFields = {}, onRemoveExtendedType, readOnly } = props;

    const [validationErrors, setValidationErrors] = useState<FieldValidationError[]>([{ identifier: false, type: false }]);
    const [hasRecordError, setHasRecordError] = useState(false);
    const [expandedExtendedTypes, setExpandedExtendedTypes] = useState<Set<string>>(new Set());

    const getExtendedTypeFields = (typeName: string): Member[] => {
        return extendedTypeFields[typeName] || [];
    };

    const toggleExtendedType = (typeName: string) => {
        const newExpanded = new Set(expandedExtendedTypes);
        if (newExpanded.has(typeName)) {
            newExpanded.delete(typeName);
        } else {
            newExpanded.add(typeName);
        }
        setExpandedExtendedTypes(newExpanded);
    };

    const handleFieldValidation = (functionIndex: number, isIdentifier: boolean, hasError: boolean) => {
        setValidationErrors(prev => {
            const newErrors = [...prev];
            if (!newErrors[functionIndex]) {
                newErrors[functionIndex] = { identifier: false, type: false };
            }
            if (isIdentifier) {
                newErrors[functionIndex] = { ...newErrors[functionIndex], identifier: hasError };
            } else {
                newErrors[functionIndex] = { ...newErrors[functionIndex], type: hasError };
            }

            return newErrors;
        });
    };

    // Handle nested record validation
    const handleNestedRecordError = (hasError: boolean) => {
        setHasRecordError(hasError);
    };

    useEffect(() => {
        // Check if any field has validation errors OR if there's a nested record error
        const hasAnyFieldError = validationErrors.some(error => error && (error.identifier || error.type));
        const hasAnyError = hasAnyFieldError || hasRecordError;
        onValidationError?.(hasAnyError);
    }, [validationErrors, hasRecordError, onValidationError]);

    const addMember = () => {
        const memberCount = Object.keys(type.members).length;
        const newMemberName = `name${memberCount + 1}`;
        const newMember: Member = {
            name: newMemberName,
            type: "string",
            kind: "FIELD",
            refs: [],
            docs: ""
        }
        onChange({ ...type, members: [...type.members, newMember] });
    }

    useImperativeHandle(ref, () => ({
        addMember
    }));

    const handleMemberChange = (index: number) => (member: Member) => {
        const newMembers = [...type.members];
        newMembers[index] = member;
        onChange({ ...type, members: newMembers });
    }

    const handleDeleteMember = (index: number) => () => {
        const newMembers = type.members.filter((_, i) => i !== index);
        onChange({ ...type, members: newMembers });
    }

    return (
        <div className="record-editor">
            {!isAnonymous &&
                <Header>
                    <SectionTitle>{isGraphql ? 'Input Object Fields' : 'Fields'}</SectionTitle>
                    {!readOnly && (
                        <div style={{ display: 'flex', gap: '8px' }} data-testid="add-field-button">
                            <Button appearance="icon" onClick={addMember}><Codicon name="add" /></Button>
                        </div>
                    )}
                </Header>
            }
            
            {/* Extended Types Section */}
            {type.includes && type.includes.length > 0 && type.includes.map((extendedTypeName) => {
                const isExpanded = expandedExtendedTypes.has(extendedTypeName);
                const isLoading = false; // No longer loading, fields are passed as props
                const extendedFields = getExtendedTypeFields(extendedTypeName);
                
                return (
                    <ExtendedTypeSection key={extendedTypeName}>
                        <ExtendedTypeHeader onClick={() => toggleExtendedType(extendedTypeName)}>
                            <Codicon name={isExpanded ? "chevron-down" : "chevron-right"} />
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>
                                {extendedTypeName}
                            </span>
                            {isLoading && <span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>Loading...</span>}
                            <ReadOnlyIndicator>extended type</ReadOnlyIndicator>
                            {onRemoveExtendedType && (
                                <Button 
                                    appearance="icon" 
                                    onClick={() => onRemoveExtendedType(extendedTypeName)}
                                    tooltip={`Remove ${extendedTypeName}`}
                                    sx={{ marginLeft: '8px', color: 'var(--vscode-editorErrorForeground)' }}
                                >
                                <Codicon name="trash" />
                        </Button>
                            )}
                        </ExtendedTypeHeader>
                        {isExpanded && !isLoading && (
                            <ExtendedTypeContent>
                                {extendedFields.length > 0 ? (
                                    extendedFields.map((field, fieldIndex) => (
                                        <FieldEditor
                                            key={`${extendedTypeName}-${fieldIndex}`}
                                            member={field}
                                            onChange={() => {}} // Extended fields are read-only for display
                                            onDelete={() => {}} // Extended fields can't be deleted individually
                                            type={type}
                                            extendedTypeFields={extendedTypeFields}
                                            onValidationError={onValidationError}
                                            onFieldValidation={(isIdentifier, hasError) => handleFieldValidation(fieldIndex, isIdentifier, hasError)}
                                            onRecordValidation={handleNestedRecordError}
                                            onRemoveExtendedType={onRemoveExtendedType}
                                            readOnly={true}
                                        />
                                    ))
                                ) : (
                                    <div style={{ 
                                        padding: '8px', 
                                        color: 'var(--vscode-descriptionForeground)', 
                                        fontSize: '12px',
                                        fontStyle: 'italic'
                                    }}>
                                        No fields found for this type
                                    </div>
                                )}
                            </ExtendedTypeContent>
                        )}
                    </ExtendedTypeSection>
                );
            })}
            
            {/* Regular Fields Section */}
            {type.members.map((member, index) => (
                <>
                    <FieldEditor
                        key={index}
                        member={member}
                        onChange={handleMemberChange(index)}
                        onDelete={handleDeleteMember(index)}
                        type={type}
                        onValidationError={onValidationError}
                        onFieldValidation={(isIdentifier, hasError) => handleFieldValidation(index, isIdentifier, hasError)}
                        onRecordValidation={handleNestedRecordError}
                        extendedTypeFields={extendedTypeFields}
                        onRemoveExtendedType={onRemoveExtendedType}
                        readOnly={readOnly}
                    />
                </>
            ))}
        </div >
    );
});