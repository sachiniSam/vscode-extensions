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

import { useState } from "react";
import styled from "@emotion/styled";
import { NodeList } from "@wso2/ballerina-side-panel";
import { ThemeColors } from "@wso2/ui-toolkit";
import { Category as PanelCategory, FormImports, FormValues } from "@wso2/ballerina-side-panel";
import { FlowNode, Type, WorkflowInputType } from "@wso2/ballerina-core";
import FormGenerator from "../Forms/FormGenerator";
import { DataMapperDisplayMode } from "@wso2/ballerina-core";
import { FormSubmitOptions } from ".";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
`;

const TabContainer = styled.div`
    display: flex;
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    padding: 0 16px;
    background: ${ThemeColors.SURFACE};
`;

const Tab = styled.button<{ active: boolean }>`
    padding: 12px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid ${(props: { active: boolean }) => (props.active ? ThemeColors.PRIMARY : "transparent")};
    color: ${(props: { active: boolean }) => (props.active ? ThemeColors.ON_SURFACE : ThemeColors.ON_SURFACE_VARIANT)};
    font-size: 14px;
    font-weight: ${(props: { active: boolean }) => (props.active ? 600 : 400)};
    cursor: pointer;
    transition: all 0.2s ease;
    outline: none;

    &:hover {
        color: ${ThemeColors.ON_SURFACE};
        background: ${ThemeColors.SURFACE_CONTAINER};
    }

    &:focus {
        outline: 1px solid ${ThemeColors.PRIMARY};
    }
`;

const TabContent = styled.div`
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
   
`;

const FormContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    max-height: calc(100vh - 80px);
`;

interface WorkflowPanelProps {
    categories: PanelCategory[];
    workflowFormNode?: FlowNode;
    nodeFormTemplate?: FlowNode;
    fileName?: string;
    projectPath?: string;
    showProgressIndicator?: boolean;
    targetLineRange?: any;
    onSelectWorkflow: (id: string, metadata?: any) => void;
    onSubmitForm: (updatedNode?: FlowNode, dataMapperMode?: DataMapperDisplayMode, options?: FormSubmitOptions) => void;
    onClose: () => void;
}

export function WorkflowPanel(props: WorkflowPanelProps) {
    const {
        categories,
        workflowFormNode,
        nodeFormTemplate,
        fileName,
        projectPath,
        showProgressIndicator,
        targetLineRange,
        onSelectWorkflow,
        onSubmitForm,
        onClose
    } = props;
    const [activeTab, setActiveTab] = useState<"create" | "existing">("create");
    const { rpcClient } = useRpcContext();

    // This function updates the type with correlation ID fields before form submission
    const updateTypeWithCorrelationIds = async (node: FlowNode) => {
        if (!fileName) return;

        try {
            // Check if there's an inputType property with typeModels
            const inputTypeProperty = (node.properties as any)?.inputType;
            if (inputTypeProperty && inputTypeProperty.types) {
                const workflowInputType = inputTypeProperty.types.find(
                    (t: any) => t.fieldType === "WORKFLOW_INPUT_TYPE"
                ) as WorkflowInputType | undefined;

                if (workflowInputType?.typeModels && workflowInputType.typeModels.length > 0) {
                    const typeModel = workflowInputType.typeModels[0];
                    
                    // Check if any fields are marked as readonly (correlation IDs)
                    const hasReadonlyFields = typeModel.members?.some(member => member.readonly);
                    
                    if (hasReadonlyFields && typeModel.name) {
                        console.log(">>> Updating type with readonly correlation ID fields", typeModel);
                        
                        // Call the LS to update the type via BIDiagram RPC client
                        // await rpcClient.getBIDiagramRpcClient().updateType({
                        //     filePath: fileName,
                        //     description: `Update ${typeModel.name} with correlation ID fields`,
                        //     type: typeModel
                        // });

                        await rpcClient.getBIDiagramRpcClient()
                    .updateType({ filePath: typeModel.codedata?.lineRange?.fileName || 'types.bal', description: `Update ${typeModel.name} with correlation ID fields`, type: typeModel });
                        
                        console.log(">>> Type updated successfully");
                    }
                }
            }
        } catch (error) {
            console.error(">>> Error updating type", error);
            // Continue with form submission even if type update fails
        }
    };

    // Handler for onSubmit (called by FormGenerator with formImports)
    const handleOnSaveForm = async (node?: FlowNode, dataMapperMode?: DataMapperDisplayMode, formImports?: FormImports) => {
        console.log(">>> WorkflowPanel handleOnSaveForm", node);
        
        if (node) {
            await updateTypeWithCorrelationIds(node);
            
            // Remove codedata lineRange before submission to avoid conflicts
            if (node.codedata && node.codedata.lineRange) {
                delete node.codedata.lineRange;
            }
        }

        // Call the original onSubmitForm
        onSubmitForm(node, dataMapperMode);
    };

    // Handler for handleOnFormSubmit (called with FormSubmitOptions)
    const handleOnFormSubmit = async (node?: FlowNode, dataMapperMode?: DataMapperDisplayMode, options?: FormSubmitOptions) => {
        console.log(">>> WorkflowPanel handleOnFormSubmit", node);
        
        if (node) {
            await updateTypeWithCorrelationIds(node);
            
            // Remove codedata lineRange before submission to avoid conflicts
            if (node.codedata && node.codedata.lineRange) {
                delete node.codedata.lineRange;
            }
        }

        // Call the original onSubmitForm
        onSubmitForm(node, dataMapperMode, options);
    };

    return (
        <Container>
            <TabContainer>
                <Tab active={activeTab === "create"} onClick={() => setActiveTab("create")}>
                    Create Workflow
                </Tab>
                <Tab active={activeTab === "existing"} onClick={() => setActiveTab("existing")}>
                    Existing Workflows
                </Tab>
            </TabContainer>

            <TabContent>
                {activeTab === "create" ? (
                    <FormContainer>
                        {workflowFormNode && (
                            <FormGenerator
                                fileName={fileName}
                                node={workflowFormNode}
                                nodeFormTemplate={nodeFormTemplate}
                                targetLineRange={targetLineRange}
                                projectPath={projectPath}
                                editForm={false}
                                onSubmit={handleOnSaveForm}
                                showProgressIndicator={showProgressIndicator}
                                handleOnFormSubmit={handleOnFormSubmit}
                            />
                        )}
                    </FormContainer>
                ) : (
                    <NodeList
                        categories={categories}
                        onSelect={onSelectWorkflow}
                        onClose={onClose}
                        title="Workflows"
                        searchPlaceholder="Search workflows"
                    />
                )}
            </TabContent>
        </Container>
    );
}
