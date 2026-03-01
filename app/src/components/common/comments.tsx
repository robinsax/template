/**
*   Re-usable comments system UI.
*/
import React, {
    KeyboardEvent, ReactNode, useState, createContext, useContext, useMemo,
    useCallback
} from "react";
import { Text, Textarea, VStack, HStack, Spacer } from "@chakra-ui/react";
import { formatDistanceToNow } from "date-fns";

import {
    CommentReactionType, commentReactionTypes, CommentTreeModel, Permission
} from "@/models";
import {
    APIBinding, APIClient, InvalidationScope, useAPI, useAsyncCallback, useAuthzCheck,
    useCurrentUser, useFetchedState, useI18n, useInvalidate
} from "@/hooks";

import { UserPersona } from "../users";
import { Icon, IconName } from "./icons";
import { ClickTarget, FullAreaSpinner } from "./layouts";

/**
*   Endpoint binding schema required for comments system to function.
*/
export type CommentsEndpoints = ReturnType<APIBinding["campaigns"]["id"]>["comments"];

type CommentContextType = {
    comments: CommentTreeModel[] | null,
    endpoints: CommentsEndpoints,
    subtargetId: string | null,
    subtargetType: string | null,
    commentEnabled: boolean,
    reactEnabled: boolean
};

const context = createContext<CommentContextType>(null as unknown as CommentContextType);

/**
*   Return the comments at the caller"s mount point or `null` if they haven"t loaded yet.
*   Can only be used below a {@link CommentsProvider}.
*/
export const useComments = () => useContext(context).comments;

const reactIcons: Record<CommentReactionType, IconName> = {
    like: "like",
    dislike: "dislike"
};

/**
*   Comments system provider. Automatically determines what features are enabled based on
*   permissions, which is respected by all other comments system components
*   automatically.
*/
export const CommentsProvider = ({
    endpoints, permissions, reactPermissions, viewPermissions, children
}: {
    endpoints: (api: APIClient) => CommentsEndpoints,
    permissions: Permission[],
    reactPermissions: Permission[],
    viewPermissions: Permission[],
    children: ReactNode
}) => {
    const api = useAPI();

    const commentEnabled = useAuthzCheck(permissions);
    const reactEnabled = useAuthzCheck(reactPermissions);
    const viewEnabled = useAuthzCheck(viewPermissions);

    const [comments, invalidate] = useFetchedState(api => endpoints(api).get(), {
        inactive: !viewEnabled
    });

    const realEndpoints = useMemo(() => endpoints(api), [endpoints]);

    const processedComments = useMemo(() => {
        if (!viewEnabled) return [];

        return comments;
    }, [comments, viewEnabled]);

    return (
        <InvalidationScope
            invalidate={ invalidate }
            queryKey="comments"
        >
            <context.Provider
                value={ {
                    comments: processedComments, endpoints: realEndpoints,
                    commentEnabled, reactEnabled, subtargetId: null, subtargetType: null
                } }
            >
                { children }
            </context.Provider>
        </InvalidationScope>
    );
};

/**
*   Provider for render trees only concerned with comments with a specific subtarget.
*  
*   Must be mounted below a {@link CommentsProvider}.
*/
export const CommentSubtargetProvider = ({ subtargetId, subtargetType, children }: {
    subtargetId: string,
    subtargetType: string,
    children: ReactNode
}) => {
    const parentContext = useContext(context);

    const subtargetComments = useMemo(() => {
        if (!parentContext.comments) return null;

        return parentContext.comments.filter(node => (
            node.comment.subtarget_id == subtargetId &&
            node.comment.subtarget_type == subtargetType
        ));
    }, [parentContext.comments, subtargetId, subtargetType]);

    return (
        <context.Provider
            value={ {
                ...parentContext,
                comments: subtargetComments, subtargetId, subtargetType
            } }
        >
            { children }
        </context.Provider>
    );
};

/**
*   View of an individual comment, with reaction / reply / child tree expansion as
*   appropriate.
*/
export const Comment = ({ comment, replyLocked }: {
    comment: CommentTreeModel,
    replyLocked?: boolean
}) => {
    const t = useI18n();
    const invalidate = useInvalidate();

    const user = useCurrentUser();

    const { reactEnabled, commentEnabled, endpoints } = useContext(context);

    const hasReacted = useCallback((type: CommentReactionType) => {
        return (
            comment.comment.reactions[type] &&
            comment.comment.reactions[type].includes(user.id)
        );
    }, [comment.comment.reactions, user.id]);

    const [onToggleReact] = useAsyncCallback(async (type: CommentReactionType) => {
        if (hasReacted(type)) {
            await endpoints.id(comment.comment.id).reactions.type(type).delete();
        } else {
            await endpoints.id(comment.comment.id).reactions.type(type).post();

            // Remove the opposite reaction if it exists
            const oppositeType: CommentReactionType = type == "like" 
                ? "dislike" 
                : "like";
            if (hasReacted(oppositeType) && (["like", "dislike"].includes(type))) {
                await endpoints
                    .id(comment.comment.id).reactions
                    .type(oppositeType)
                    .delete();
            }
        }

        invalidate({
            queryKeys: ["comments"]
        });
    }, [hasReacted]);

    const [repliesOpen, setRepliesOpen] = useState(false);

    const hasChildren = !!comment.children.length;
    const canReply = commentEnabled && !comment.depth && !replyLocked;
    return (
        <VStack width="full" alignItems="left" spacing={ 4 }>
            <VStack width="full" alignItems="left" spacing={ 2 }>
                <HStack width="full" spacing={ 4 }>
                    <UserPersona
                        for={ comment.comment.user }
                        size="sm"
                        withRole
                    />
                    <Spacer/>
                    <Text variant="light">
                        { formatDistanceToNow(comment.comment.created_at, {
                            addSuffix: true
                        }) }
                    </Text>
                    <HStack spacing={ 1 }>
                        { commentReactionTypes.map(type => (
                            <ClickTarget
                                key={ type }
                                p={ 2 }
                                disableHighlight={ !reactEnabled }
                                showHighlight={ hasReacted(type) }
                                onClick={ () => onToggleReact(type) }
                            >
                                <HStack spacing={ 1 }>
                                    <Icon name={ reactIcons[type] }/>
                                    { comment.comment.reactions[type] && (
                                        <Text fontSize="2xs">
                                            { comment.comment.reactions[type].length }
                                        </Text>
                                    ) }
                                </HStack>
                            </ClickTarget>
                        )) }
                    </HStack>
                </HStack>
                <Text fontSize="md" p={ 2 }>
                    { comment.comment.content }
                </Text>
            </VStack>
            <HStack width="full" justifyContent="flex-end">
                { (hasChildren || canReply) && (
                    <ClickTarget
                        p={ 2 }
                        onClick={ () => setRepliesOpen(!repliesOpen) }
                    >
                        <HStack>
                            <Icon name={ repliesOpen ? "up" : "down" }/>
                            <Text fontSize="xs">
                                { repliesOpen ? (
                                    hasChildren ?
                                        t("Hide replies")
                                    :
                                        t("Cancel")
                                ) : (
                                    hasChildren ?
                                        t("{count} Repl{count:y:ies}", {
                                            count: comment.children.length
                                        })
                                    :
                                        t("Reply")
                                ) }
                            </Text>
                        </HStack>
                    </ClickTarget>
                ) }
            </HStack>
            { repliesOpen && (
                <>
                    <VStack pl={ 6 } spacing={ 4 }>
                        { comment.children.map(child => (
                            <Comment key={ child.comment.id } comment={ child }/>
                        )) }
                    </VStack>
                    { canReply && (
                        <CommentInput parentId={ comment.comment.id }/>
                    ) }
                </>
            ) }
        </VStack>
    );
};

/**
*   Renders all comments provided at the mount point.
*/
export const Comments = () => {
    const t = useI18n();

    const comments = useComments();

    return (
        <>
            { comments ? (
                comments.length ? (
                    comments.map(comment => (
                        <Comment key={ comment.comment.id } comment={ comment }/>
                    ))
                ) : (
                    <Text variant="light">{ t("No comments.") }</Text>
                )
            ) : (
                <FullAreaSpinner/>
            ) }
        </>
    );
};

/**
*   A component that renders a comment input field, optionally for some parent comment
*   with `parentId`.
*/
export const CommentInput = ({ parentId, onDone }: {
    parentId?: string,
    onDone?: () => void
}) => {
    const t = useI18n();
    const invalidate = useInvalidate();

    const {
        commentEnabled, endpoints, subtargetId, subtargetType
    } = useContext(context);

    const [input, setInput] = useState("");

    const [onKeyUp] = useAsyncCallback(async (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key != "Enter" || e.shiftKey) return;

        const content = e.currentTarget.value.trim();
        if (!content) return;

        await endpoints.post({
            content,
            parent_id: parentId || null,
            subtarget_id: subtargetId || null,
            subtarget_type: subtargetType || null
        });

        invalidate({
            queryKeys: ["comments"]
        });
        setInput("");
        if (onDone) onDone();
    }, []);

    return commentEnabled && (
        <Textarea
            resize="none"
            placeholder={ t("Leave a comment...") }
            value={ input }
            onChange={ e => setInput(e.target.value) }
            onKeyUp={ onKeyUp }
        />
    );
};
