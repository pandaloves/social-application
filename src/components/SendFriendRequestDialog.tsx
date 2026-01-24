"use client";

import {
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";

type SendFriendRequestDialogProps = {
  sendRequestOpen: boolean;
  setSendRequestOpen: React.Dispatch<React.SetStateAction<boolean>>;
  friendUsername: string;
  setFriendUsername: React.Dispatch<React.SetStateAction<string>>;
};

export default function SendFriendRequestDialog({
  sendRequestOpen,
  setSendRequestOpen,
  friendUsername,
  setFriendUsername,
}: SendFriendRequestDialogProps) {
  return (
    <Dialog open={sendRequestOpen} onClose={() => setSendRequestOpen(false)}>
      <DialogTitle>Send Friend Request</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Friend's Username"
          type="text"
          fullWidth
          variant="outlined"
          value={friendUsername}
          onChange={(e) => setFriendUsername(e.target.value)}
          placeholder="Enter username (without @)"
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Enter the username of the person you want to add as a friend
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSendRequestOpen(false)}>Cancel</Button>
        <Button
          onClick={() => {
            setSendRequestOpen(false);
          }}
          variant="contained"
        >
          Send Request
        </Button>
      </DialogActions>
    </Dialog>
  );
}
