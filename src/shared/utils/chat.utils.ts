export const ChatUtils = {
    getUserRoom: (userId: string | number): string => {
        return `user_room_${userId}`;
    },

    getGroupRoom: (groupId: string): string => {
        return `group_room_${groupId}`;
    },
};
