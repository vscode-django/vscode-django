color = ['w',"b"]
species = ['queen','king','bishop','knight','castle','pawn']


def create_desk():
    N = 8
    desk = []


    for i in range(N):
        desk.append([0]*N)
    print(desk)
    
    
    return (desk)

class figure ():

    def __init__(self,color,species):
        self.color = color
        self.species = species

    def move(self):
        if self.species == 'pawn' :
            return [(0,1),(0,2),(1,1),(-1,1)]
        if self.species == 'queen' :
            return [(1,1),(1,0),(1,-1),(0,1),(0,-1),(-1,0),(-1,-1),(-1,1)]
        if self.species == 'castle' :
            return [(0,1),(0,2),(1,1),(-1,1)]
        if self.species == 'pawn' :
            return [(0,1),(0,2),(1,1),(-1,1)]
        if self.species == 'pawn' :
            return [(0,1),(0,2),(1,1),(-1,1)]
        if self.species == 'pawn' :
            return [(0,1),(0,2),(1,1),(-1,1)]
        if self.species == 'pawn' :
            return [(0,1),(0,2),(1,1),(-1,1)]
    
obl = figure("w","queen")
print (obl.move())
create_desk()
h = "Hello world!"
print(h)