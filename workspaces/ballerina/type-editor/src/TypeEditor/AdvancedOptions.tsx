import React, { useState, useEffect } from 'react';
import { Button, CheckBox, Codicon, AutoComplete } from '@wso2/ui-toolkit';
import { Type } from '@wso2/ballerina-core';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { URI, Utils } from 'vscode-uri';
import styled from '@emotion/styled';

interface AdvancedOptionsProps {
    type: Type;
    onChange: (type: Type) => void;
    showExtendSection?: boolean;
}

const ExtendSectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-editor-foreground);
    min-width: 200px;
`;

const ExtendSectionContainer = styled.div`
    border: 1px solid var(--vscode-welcomePage-tileBorder);
    border-radius: 4px;
    padding: 12px;
    position: relative;
`;

const ExtendSectionRow = styled.div`
    display: flex;
    align-items: flex-start;
    width: 100%;
`;

export function AdvancedOptions({ type, onChange, showExtendSection = false }: AdvancedOptionsProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [availableTypes, setAvailableTypes] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const { rpcClient } = useRpcContext();

    // Fetch available types from backend
    useEffect(() => {
        const fetchAvailableTypes = async () => {
            if (!rpcClient || !isExpanded) return;
            
            setLoading(true);
            try {
                const projectUri = await rpcClient.getVisualizerLocation().then((res) => res.projectUri);
                const endPosition = await rpcClient.getBIDiagramRpcClient().getEndOfFile({
                    filePath: Utils.joinPath(URI.file(projectUri), 'types.bal').fsPath
                });

                const response = await rpcClient.getBIDiagramRpcClient().getVisibleTypes({
                    filePath: type?.codedata?.lineRange?.fileName || 'types.bal',
                    position: {
                        line: type?.codedata?.lineRange?.startLine?.line ?? endPosition.line,
                        offset: type?.codedata?.lineRange?.startLine?.offset ?? endPosition.offset
                    },
                    typeConstraint: "record"
                });

                // Filter to get only record types and exclude already selected types
                const typeNames = response
                    .filter(item => item.kind === 22)
                    .filter(item => (item.label !== "record" && item.insertText !== "record"))
                    .map(item => item.label);

                setAvailableTypes(typeNames);
            } catch (error) {
                console.error('Error fetching available types:', error);
                // Fallback to empty array on error
                setAvailableTypes([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAvailableTypes();
    }, [rpcClient, isExpanded, type.includes, type.codedata]);

    // Filter out already selected types from the dropdown
    const filteredAvailableTypes = availableTypes.filter(
        typeName => !type.includes?.includes(typeName)
    );

    const handleExtendTypeSelection = (value: string) => {
        if (value && value !== '' && !type.includes?.includes(value)) {
            const updatedIncludes = [...(type.includes || []), value];
            onChange({ ...type, includes: updatedIncludes });
        }
    };

    return (
        <div>
            <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px', marginBottom: '5px', cursor: 'pointer' }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <Button
                    appearance='icon'
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                >
                    <Codicon name={isExpanded ? "chevron-up" : "chevron-down"} />
                </Button>
                <span>Advanced Options</span>
            </div>
            {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginLeft: '5px' }}>
                    <CheckBox
                        sx={{ border: 'none', padding: '5px' }}
                        label="Allow Additional Fields"
                        checked={type?.allowAdditionalFields === true}
                        onChange={(checked: boolean) => {
                            onChange({ ...type, allowAdditionalFields: checked });
                        }}
                    />
                    
                    {/* Only show "Extend from existing types" section if enabled and there are types available */}
                    {showExtendSection && availableTypes.length > 0 && (
                        <ExtendSectionContainer>
                            <ExtendSectionRow>
                                <ExtendSectionHeader>
                                    Extend from existing types
                                    {loading && <span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', marginLeft: '8px' }}>Loading...</span>}
                                </ExtendSectionHeader>
                                <div style={{ flex: 1 }}>
                                    {!loading && filteredAvailableTypes.length > 0 ? (
                                        <AutoComplete
                                            id="extend-type-selector"
                                            label=""
                                            items={filteredAvailableTypes}
                                            onValueChange={(value) => handleExtendTypeSelection(value)}
                                        />
                                    ) : !loading && filteredAvailableTypes.length === 0 && availableTypes.length > 0 && (
                                        <div style={{ 
                                            padding: '8px 12px', 
                                            color: 'var(--vscode-descriptionForeground)', 
                                            fontSize: '12px',
                                            fontStyle: 'italic'
                                        }}>
                                            All available types have been selected
                                        </div>
                                    )}
                                </div>
                            </ExtendSectionRow>
                        </ExtendSectionContainer>
                    )}
                </div>
            )}
        </div>
    );
}
